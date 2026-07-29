<script setup lang="ts">
/**
 * Embed 模式：一个不带 admin 布局的极简 chat 界面。设计目标 —— 直接扔进
 * iframe 到任何站点（营销页、内网 wiki、社区帖子）都能立刻用。
 *
 * URL 形态: /embed/agent/:id?conversation=xxx&title=...
 *
 * 与 views/agent/chat.vue 的核心不同：
 *  - 无 header / menu / sidebar；纯 chat bubble + 输入框。
 *  - 支持 URL query 参数覆盖 (title/model/conversation) 让宿主站点定制。
 *  - localStorage 仍然记住 conversation，但 key 加了"embed"前缀避免污染 admin。
 */
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import {
  type AgentEntity,
  chatStream,
  fetchConversations,
  fetchHistory,
  getAgent,
} from '#/api/agent';

const route = useRoute();
const agentId = computed(() => route.params.id as string);
const overrideTitle = computed(() => route.query.title as string | undefined);
const conversationParam = computed(() => route.query.conversation as string | undefined);
const storageKey = computed(() => `spring-agent:embed:${agentId.value}:conversation`);

const agent = ref<AgentEntity | null>(null);
const messages = ref<
  Array<{ role: 'user' | 'assistant'; content: string; failed?: boolean }>
>([]);
const input = ref('');
const sending = ref(false);
const conversationId = ref<string | undefined>(undefined);
const scroller = ref<HTMLElement | null>(null);
const errorNote = ref<string | null>(null);

onMounted(async () => {
  try {
    agent.value = await getAgent(agentId.value);
  } catch (e: any) {
    errorNote.value = `无法加载 agent (${e?.message ?? e})`;
    return;
  }
  const explicit = conversationParam.value;
  const stored = localStorage.getItem(storageKey.value) ?? undefined;
  conversationId.value = explicit ?? stored;
  if (conversationId.value) {
    try {
      const h = await fetchHistory(agentId.value, conversationId.value);
      messages.value = h.map((m) => ({
        role: m.role === 'USER' ? 'user' : 'assistant',
        content: m.content,
      }));
      scrollBottom();
    } catch {
      // best-effort; new conversation on failure
    }
  }
  // Warm the browser's `fetchConversations` cache so a future "switch" affordance is fast;
  // don't render a switcher in the embed to keep the UI minimal.
  fetchConversations(agentId.value).catch(() => []);
});

async function scrollBottom() {
  await nextTick();
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight });
}

async function send() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  messages.value.push({ role: 'user', content: text });
  const asst = { role: 'assistant' as const, content: '', failed: false };
  messages.value.push(asst);
  scrollBottom();
  sending.value = true;
  try {
    const res = await chatStream(agentId.value, {
      query: text,
      conversationId: conversationId.value,
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let event = 'message';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split(/\r?\n\r?\n/);
      buf = parts.pop() ?? '';
      for (const chunk of parts) {
        let data = '';
        for (const line of chunk.split(/\r?\n/)) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (!data) continue;
        try {
          const parsed = JSON.parse(data);
          if (event === 'result') {
            asst.content = parsed.text ?? '(no content)';
            conversationId.value = parsed.conversationId;
            if (parsed.conversationId) {
              localStorage.setItem(storageKey.value, parsed.conversationId);
            }
          } else if (event === 'error') {
            asst.content = `❌ ${parsed.message ?? '未知错误'}`;
            asst.failed = true;
          }
        } catch {
          // ignore
        }
        scrollBottom();
      }
    }
  } catch (e: any) {
    asst.content = `❌ ${e?.message ?? e}`;
    asst.failed = true;
  } finally {
    sending.value = false;
    scrollBottom();
  }
}

function onEnter(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) {
    send();
  }
}
</script>

<template>
  <div class="embed-shell flex h-screen flex-col bg-white">
    <header class="border-b px-3 py-2 text-sm font-medium text-gray-700">
      {{ overrideTitle ?? agent?.name ?? '智能体' }}
    </header>

    <div v-if="errorNote" class="p-3 text-sm text-red-500">
      {{ errorNote }}
    </div>

    <main ref="scroller" class="flex-1 overflow-y-auto p-3">
      <div v-if="messages.length === 0" class="text-center text-sm text-gray-400 py-10">
        {{ agent?.instructions ? agent.instructions.slice(0, 120) : '发一条消息开始对话。' }}
      </div>
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="mb-3"
      >
        <div class="mb-1 text-xs font-medium">
          <span :class="m.role === 'user' ? 'text-blue-500' : 'text-green-600'">
            {{ m.role === 'user' ? '你' : (agent?.name ?? 'Agent') }}
          </span>
        </div>
        <div
          class="rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
          :class="m.role === 'user' ? 'bg-blue-50' : (m.failed ? 'bg-red-50 text-red-600' : 'bg-gray-50')"
        >
          {{ m.content }}
        </div>
      </div>
    </main>

    <footer class="border-t p-2">
      <div class="flex gap-2">
        <textarea
          v-model="input"
          rows="2"
          placeholder="输入消息，Ctrl+Enter 发送"
          class="flex-1 resize-none rounded border px-2 py-1 text-sm outline-none focus:border-blue-400"
          @keydown.enter="onEnter"
        />
        <button
          class="rounded bg-blue-500 px-4 py-1 text-sm text-white disabled:opacity-50"
          :disabled="sending"
          @click="send"
        >
          {{ sending ? '…' : '发送' }}
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.embed-shell {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>

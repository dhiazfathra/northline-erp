import { z } from 'zod'

export const aiMessageSchema = z.object({ bot: z.boolean(), text: z.string(), time: z.string(), credits: z.number().optional() })
export type AiMessage = z.infer<typeof aiMessageSchema>

export const aiConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  report: z.string(),
  reportId: z.string(),
  /** ISO date-time */
  at: z.string(),
  messages: z.array(aiMessageSchema),
})
export type AiConversation = z.infer<typeof aiConversationSchema>

/*
# Create private chat tables

1. New Tables
- `chat_rooms` stores 1-to-1 private conversation rooms between two signed-in users.
  - `id` is the room UUID.
  - `user_one` is the user who initiated the chat.
  - `user_two` is the user who owns the post that started the conversation.
  - `created_at` records when the room was created.
- `chat_messages` stores individual messages within a room.
  - `id` is the message UUID.
  - `room_id` references the parent room and cascades on deletion.
  - `sender_id` identifies the message author and defaults to the authenticated session user.
  - `message_text` stores the message body.
  - `created_at` records when the message was sent.

2. Security
- Row Level Security is enabled on both tables.
- A user can only read/insert rooms where they are user_one or user_two.
- A user can only read/insert messages in rooms where they are a participant.
- Anonymous users have no Data API access.
- sender_id is database-controlled through auth.uid() and excluded from client insert privileges.
- Messages are invisible to anyone who is not a participant in the room.

3. Important Notes
- A unique index on (user_one, user_two) prevents duplicate rooms for the same pair.
- No UPDATE or DELETE on chat_messages: messages cannot be edited or deleted by users.
- The message center lists all rooms where the current user is a participant.
*/

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_one uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_two uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.chat_rooms FROM anon, authenticated;
GRANT SELECT ON public.chat_rooms TO authenticated;
GRANT INSERT (user_one, user_two) ON public.chat_rooms TO authenticated;

DROP POLICY IF EXISTS "read_own_chat_rooms" ON public.chat_rooms;
CREATE POLICY "read_own_chat_rooms" ON public.chat_rooms
  FOR SELECT TO authenticated
  USING (auth.uid() = user_one OR auth.uid() = user_two);

DROP POLICY IF EXISTS "insert_chat_rooms" ON public.chat_rooms;
CREATE POLICY "insert_chat_rooms" ON public.chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_one OR auth.uid() = user_two);

CREATE UNIQUE INDEX IF NOT EXISTS chat_rooms_pair_unique
  ON public.chat_rooms (LEAST(user_one, user_two), GREATEST(user_one, user_two));

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.chat_messages FROM anon, authenticated;
GRANT SELECT ON public.chat_messages TO authenticated;
GRANT INSERT (room_id, message_text) ON public.chat_messages TO authenticated;

DROP POLICY IF EXISTS "read_own_chat_messages" ON public.chat_messages;
CREATE POLICY "read_own_chat_messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE chat_rooms.id = chat_messages.room_id
      AND (chat_rooms.user_one = auth.uid() OR chat_rooms.user_two = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_own_chat_messages" ON public.chat_messages;
CREATE POLICY "insert_own_chat_messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE chat_rooms.id = chat_messages.room_id
      AND (chat_rooms.user_one = auth.uid() OR chat_rooms.user_two = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS chat_messages_room_id_idx
  ON public.chat_messages (room_id, created_at);

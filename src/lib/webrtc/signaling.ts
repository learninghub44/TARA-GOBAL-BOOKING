import { createClient } from '@/lib/supabase/server'

export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'hangup'
  senderId: string
  receiverId: string
  conversationId: string
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

export async function sendWebRTCSignal(signal: WebRTCSignal): Promise<void> {
  const supabase = await createClient()
  
  // Store signal in Supabase Realtime
  const { error } = await supabase
    .from('webrtc_signals')
    .insert({
      sender_id: signal.senderId,
      receiver_id: signal.receiverId,
      conversation_id: signal.conversationId,
      signal_type: signal.type,
      signal_data: {
        sdp: signal.sdp,
        candidate: signal.candidate,
      },
    })

  if (error) {
    console.error('Failed to send WebRTC signal:', error)
    throw error
  }
}

export async function subscribeToWebRTCSignals(
  userId: string,
  callback: (signal: WebRTCSignal) => void
): Promise<() => void> {
  const supabase = await createClient()
  
  const channel = supabase
    .channel(`webrtc:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        const signalData = payload.new as any
        callback({
          type: signalData.signal_type,
          senderId: signalData.sender_id,
          receiverId: signalData.receiver_id,
          conversationId: signalData.conversation_id,
          sdp: signalData.signal_data?.sdp,
          candidate: signalData.signal_data?.candidate,
        })
      }
    )
    .subscribe()

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel)
  }
}

export async function cleanupWebRTCSignals(conversationId: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('webrtc_signals')
    .delete()
    .eq('conversation_id', conversationId)

  if (error) {
    console.error('Failed to cleanup WebRTC signals:', error)
  }
}

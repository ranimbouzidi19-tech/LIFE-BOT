
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
};

const API_URL = 'http://localhost:3000/chat';


export default function ChatScreen() {
  const [message, setMessage] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm LIFE-BOT 🤖 Your personal companion. How are you feeling today?",
      sender: 'bot',
    },
  ]);

  async function sendMessage() {
    if (message.trim() === '' || isLoading) return;

    const userMessage = message.trim();

    setMessages(previous => [
      ...previous,
      {
        id: Date.now(),
        text: userMessage,
        sender: 'user',
      },
    ]);

    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId,
        }),
      });

      const data = await response.json();
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      
      if (!response.ok) {
        const errorMessage =
          data.code === 'GEMINI_QUOTA_EXCEEDED'
            ? "I'm sorry ❤️ My AI service has reached its daily limit. Your messages are safe, and I'll be back when the quota resets. 🤖"
            : data.error || 'Something went wrong. Please try again.';

        setMessages(previous => [
          ...previous,
          {
            id: Date.now() + 1,
            text: errorMessage,
            sender: 'bot',
          },
        ]);

        return;
      }


      setMessages(previous => [
        ...previous,
        {
          id: Date.now() + 1,
          text: data.reply || 'Sorry, I could not generate a response.',
          sender: 'bot',
        },
      ]);
    } catch (error) {
      console.log('Chat error:', error);

      setMessages(previous => [
        ...previous,
        {
          id: Date.now() + 1,
          text: "I'm sorry ❤️ I can't connect to the server right now. Please check your internet connection and try again.",
          sender: 'bot',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.back}>🤖</Text>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>LIFE-BOT</Text>
            <Text style={styles.status}>● Your AI companion</Text>
          </View>
        </View>

        {/* Welcome */}
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>Your safe space ❤️</Text>
          <Text style={styles.welcomeText}>
            Talk to me whenever you need.
          </Text>
        </View>

        {/* Messages */}
        <ScrollView
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(item => (
            <View
              key={item.id}
              style={[
                styles.messageRow,
                item.sender === 'user'
                  ? styles.userRow
                  : styles.botRow,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  item.sender === 'user'
                    ? styles.userBubble
                    : styles.botBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    item.sender === 'user'
                      ? styles.userText
                      : styles.botText,
                  ]}
                >
                  {item.text}
                </Text>
              </View>
            </View>
          ))}

          {isLoading && (
            <View style={[styles.messageRow, styles.botRow]}>
              <View style={[styles.bubble, styles.botBubble]}>
                <Text style={styles.botText}>
                  LIFE-BOT is typing... 🤖
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Message input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            placeholderTextColor="#A6A0B5"
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              isLoading && { opacity: 0.5 },
            ]}
            onPress={sendMessage}
            disabled={isLoading}
          >
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  keyboard: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEAF5',
  },
  back: {
    fontSize: 32,
    marginRight: 15,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#29243D',
  },
  status: {
    fontSize: 12,
    color: '#55A77B',
    marginTop: 4,
  },
  welcome: {
    alignItems: 'center',
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7761C8',
  },
  welcomeText: {
    color: '#9993A8',
    marginTop: 6,
  },
  messages: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 15,
    gap: 15,
  },
  messageRow: {
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#7761C8',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#29243D',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEAF5',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F3FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    color: '#29243D',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#7761C8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 22,
  },
});

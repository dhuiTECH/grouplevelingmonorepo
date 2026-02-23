import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { User } from '@/types/user';
import { useGlobalChat, ChatMessage } from '@/hooks/useGlobalChat';
import { Ionicons } from '@expo/vector-icons';
import LayeredAvatar from '@/components/LayeredAvatar';

interface GlobalTerminalProps {
  userProfile: User;
}

export const GlobalTerminal: React.FC<GlobalTerminalProps> = ({ userProfile }) => {
  const { messages, loading, sendMessage } = useGlobalChat();
  const [newMessage, setNewMessage] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = async () => {
    if (newMessage.trim()) {
      const success = await sendMessage(newMessage);
      if (success) setNewMessage('');
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isCurrentUser = item.user_id === userProfile?.id;
    return (
      <View style={[styles.messageRow, isCurrentUser ? styles.myMessageRow : styles.otherMessageRow]}>
        {!isCurrentUser && (
          <View style={styles.avatarContainer}>
            {item.senderUser ? (
              <LayeredAvatar user={item.senderUser} size={30} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </View>
        )}
        <View style={[styles.messageBubble, isCurrentUser ? styles.myMessageBubble : styles.otherMessageBubble]}>
          {!isCurrentUser && <Text style={styles.username}>{item.username}</Text>}
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, isKeyboardVisible && styles.containerKeyboard]}>
        <Text style={styles.header}>GLOBAL TERMINAL</Text>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#22d3ee" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isKeyboardVisible && styles.containerKeyboard]}>
      <Text style={styles.header}>GLOBAL TERMINAL</Text>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          inverted
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.systemMessage}>No messages yet. Say something.</Text>
            </View>
          }
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    minHeight: 200,
  },
  containerKeyboard: {
    minHeight: 140,
    maxHeight: 260,
  },
  header: {
    fontSize: 10,
    color: '#22d3ee',
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  messageList: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  emptyWrap: {
    paddingVertical: 16,
  },
  systemMessage: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#334155',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
  },
  myMessageBubble: {
    backgroundColor: 'rgba(34, 211, 238, 0.25)',
    borderBottomRightRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  otherMessageBubble: {
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.15)',
  },
  username: {
    color: '#fbbf24',
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 11,
  },
  messageText: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  timestamp: {
    color: '#64748b',
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 0,
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 18,
    paddingHorizontal: 14,
    color: '#e2e8f0',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 211, 238, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.5)',
  },
});

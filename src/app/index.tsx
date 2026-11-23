
import { useRouter } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.name}>Welcome to LIFE-BOT</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🤖</Text>
          </View>
        </View>

        {/* AI Card */}
        <View style={styles.aiCard}>
          <Text style={styles.aiEmoji}>🤖</Text>
          <Text style={styles.aiTitle}>Your AI Companion</Text>
          <Text style={styles.aiDescription}>
            I'm here to talk, listen and help you every day.
          </Text>

          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push('/chat')}
          >
            <Text style={styles.chatButtonText}>Start a conversation →</Text>
          </TouchableOpacity>
        </View>

        {/* Reminders */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Your daily care</Text>

  <TouchableOpacity
    style={styles.reminderCard}
    onPress={() => router.push('/reminders')}
  >
    <Text style={styles.cardEmoji}>📅</Text>

    <View style={styles.cardInfo}>
      <Text style={styles.cardTitle}>My Reminders</Text>
      <Text style={styles.cardDescription}>
        Manage medication, exams and appointments
      </Text>
    </View>

    <Text style={styles.arrow}>›</Text>
  </TouchableOpacity>
</View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your daily care</Text>

          <View style={styles.reminderCard}>
            <Text style={styles.cardEmoji}>💊</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Medication</Text>
              <Text style={styles.cardDescription}>
                Don't forget your medication
              </Text>
            </View>
            <Text style={styles.time}>09:00</Text>
          </View>

          <View style={styles.reminderCard}>
            <Text style={styles.cardEmoji}>📅</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Appointment</Text>
              <Text style={styles.cardDescription}>
                Your next appointment
              </Text>
            </View>
            <Text style={styles.time}>10:30</Text>
          </View>
        </View>

        {/* Robot status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Robot</Text>

          <View style={styles.robotCard}>
            <Text style={styles.robotEmoji}>🤖</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>LIFE-BOT Robot</Text>
              <Text style={styles.online}>● Not connected</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          LIFE-BOT • Your companion, always with you ❤️
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FC', paddingHorizontal: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 28 },
  greeting: { fontSize: 16, color: '#88849A' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#29243D', marginTop: 5 },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#E9E2FF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28 },
  aiCard: { backgroundColor: '#7761C8', borderRadius: 25, padding: 24, alignItems: 'center', marginBottom: 30 },
  aiEmoji: { fontSize: 55, marginBottom: 12 },
  aiTitle: { fontSize: 23, fontWeight: 'bold', color: '#FFFFFF' },
  aiDescription: { fontSize: 14, color: '#EEE9FF', textAlign: 'center', marginTop: 10, lineHeight: 22 },
  chatButton: { backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 15, marginTop: 22 },
  chatButtonText: { color: '#6650B5', fontWeight: 'bold', fontSize: 14 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', color: '#29243D', marginBottom: 15 },
  reminderCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardEmoji: { fontSize: 27, marginRight: 14 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#29243D' },
  cardDescription: { fontSize: 12, color: '#9993A8', marginTop: 5 },
  time: { color: '#7761C8', fontWeight: 'bold' },
  robotCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center' },
  robotEmoji: { fontSize: 35, marginRight: 15 },
  online: { fontSize: 12, color: '#E58B63', marginTop: 5 },
  arrow: { fontSize: 28, color: '#7761C8' },
  footer: { textAlign: 'center', color: '#AAA4B8', fontSize: 11, marginVertical: 25 },
});

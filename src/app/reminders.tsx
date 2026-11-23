import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';

const API_URL = 'http://localhost:3000';

type Reminder = {
  id: string;
  title: string;
  description: string;
  category: string;
  remindAt: string;
  status: 'pending' | 'completed' | 'cancelled';
};

const categories = [
  { label: 'Study', value: 'study' },
  { label: 'Medication', value: 'medication' },
  { label: 'Appointment', value: 'appointment' },
  { label: 'Task', value: 'task' },
  { label: 'General', value: 'general' },
];

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Récupérer les rappels depuis Firebase via le backend
  async function loadReminders() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/reminders`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cannot load reminders');
      }

      setReminders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Connection error'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReminders();
  }, []);

  // Vérifier et préparer les notifications locales
  async function scheduleLocalNotification(reminder: Reminder) {
    if (Platform.OS === 'web') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'LIFE-BOT Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    let permission = await Notifications.getPermissionsAsync();

    if (!permission.granted) {
      permission = await Notifications.requestPermissionsAsync();
    }

    if (!permission.granted) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `LIFE-BOT: ${reminder.title}`,
        body: reminder.description || 'It is time for your reminder!',
        data: { reminderId: reminder.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminder.remindAt),
      },
    });

    return true;
  }

  // Annuler la notification liée à un rappel
  async function cancelLocalNotification(reminderId: string) {
    if (Platform.OS === 'web') return;

    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduled) {
      if (notification.content.data?.reminderId === reminderId) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  }

  // Créer un rappel
  async function createReminder() {
    setNotice('');
    setError('');

    if (!title.trim() || !date.trim() || !time.trim()) {
      setError('Please enter a title, date and time.');
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{2}:\d{2}$/.test(time)
    ) {
      setError('Date format: YYYY-MM-DD and time format: HH:MM.');
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);

    const reminderDate = new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      0
    );

    if (
      reminderDate.getFullYear() !== year ||
      reminderDate.getMonth() !== month - 1 ||
      reminderDate.getDate() !== day ||
      hour > 23 ||
      minute > 59
    ) {
      setError('Please enter a valid date and time.');
      return;
    }

    if (reminderDate.getTime() <= Date.now()) {
      setError('Please choose a future date and time.');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          remindAt: reminderDate.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cannot create reminder');
      }

      const savedReminder = data.reminder as Reminder;

      setReminders(previous =>
        [...previous, savedReminder].sort(
          (a, b) =>
            new Date(a.remindAt).getTime() -
            new Date(b.remindAt).getTime()
        )
      );

      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
      setCategory('general');

      if (Platform.OS === 'web') {
        setNotice(
          'Reminder saved in Firebase! Test phone notifications on Android or iOS.'
        );
      } else {
        try {
          const scheduled =
            await scheduleLocalNotification(savedReminder);

          setNotice(
            scheduled
              ? 'Reminder saved and phone notification scheduled!'
              : 'Reminder saved, but notification permission was not granted.'
          );
        } catch {
          setNotice(
            'Reminder saved in Firebase, but notification scheduling failed.'
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Cannot create reminder'
      );
    } finally {
      setSaving(false);
    }
  }

  // Marquer un rappel comme terminé
  async function completeReminder(id: string) {
    try {
      const response = await fetch(`${API_URL}/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cannot update reminder');
      }

      setReminders(previous =>
        previous.map(item =>
          item.id === id ? data.reminder : item
        )
      );

      try {
        await cancelLocalNotification(id);
      } catch {
        // Le rappel reste marqué comme terminé même si l'annulation échoue.
      }

      setNotice('Reminder marked as completed.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Update failed'
      );
    }
  }

  // Supprimer un rappel
  async function deleteReminder(id: string) {
    try {
      const response = await fetch(`${API_URL}/reminders/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cannot delete reminder');
      }

      setReminders(previous =>
        previous.filter(item => item.id !== id)
      );

      try {
        await cancelLocalNotification(id);
      } catch {
        // La suppression Firebase est déjà effectuée.
      }

      setNotice('Reminder deleted successfully.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Delete failed'
      );
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>My Reminders</Text>
      <Text style={styles.subtitle}>
        Organize your day and never forget what matters.
      </Text>

      {/* Formulaire */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>Create a reminder</Text>

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Revise IoT"
          placeholderTextColor="#A39CB2"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder="Add some details..."
          placeholderTextColor="#A39CB2"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categories}>
          {categories.map(item => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.categoryButton,
                category === item.value && styles.selectedCategory,
              ]}
              onPress={() => setCategory(item.value)}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === item.value && styles.selectedCategoryText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD (ex: 2026-11-25)"
          placeholderTextColor="#A39CB2"
          value={date}
          onChangeText={setDate}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Time *</Text>
        <TextInput
          style={styles.input}
          placeholder="HH:MM (ex: 09:30)"
          placeholderTextColor="#A39CB2"
          value={time}
          onChangeText={setTime}
          keyboardType="numbers-and-punctuation"
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={createReminder}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : '+ Add reminder'}
          </Text>
        </TouchableOpacity>
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Liste des rappels */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Your reminders</Text>
        <TouchableOpacity onPress={loadReminders}>
          <Text style={styles.refresh}>Refresh ↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#7761C8" />
      ) : reminders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={styles.emptyText}>No reminders yet.</Text>
          <Text style={styles.emptySubtext}>
            Create your first reminder above.
          </Text>
        </View>
      ) : (
        reminders.map(item => (
          <View key={item.id} style={styles.reminderCard}>
            <View style={styles.reminderTop}>
              <Text style={styles.reminderTitle}>{item.title}</Text>
              <Text
                style={[
                  styles.status,
                  item.status === 'completed' && styles.completedStatus,
                ]}
              >
                {item.status === 'completed' ? 'Completed' : 'Pending'}
              </Text>
            </View>

            {item.description ? (
              <Text style={styles.reminderDescription}>
                {item.description}
              </Text>
            ) : null}

            <Text style={styles.reminderCategory}>
              {item.category}
            </Text>

            <Text style={styles.reminderDate}>
              {new Date(item.remindAt).toLocaleString('fr-FR')}
            </Text>

            <View style={styles.actions}>
              {item.status === 'pending' && (
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => completeReminder(item.id)}
                >
                  <Text style={styles.actionText}>Complete</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteReminder(item.id)}
              >
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  content: {
    padding: 22,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#29243D',
    marginTop: 12,
  },
  subtitle: {
    color: '#88849A',
    fontSize: 14,
    marginTop: 7,
    marginBottom: 24,
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 19,
    borderRadius: 20,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#29243D',
    marginBottom: 17,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#514B65',
    marginBottom: 7,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8F7FC',
    borderWidth: 1,
    borderColor: '#E9E4F2',
    borderRadius: 12,
    padding: 13,
    color: '#29243D',
    fontSize: 14,
  },
  descriptionInput: {
    minHeight: 75,
    textAlignVertical: 'top',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1EEF8',
  },
  selectedCategory: {
    backgroundColor: '#7761C8',
  },
  categoryText: {
    color: '#665F78',
    fontSize: 12,
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#7761C8',
    padding: 15,
    borderRadius: 13,
    alignItems: 'center',
    marginTop: 22,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  notice: {
    color: '#39845A',
    backgroundColor: '#EAF6EE',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  error: {
    color: '#B42318',
    backgroundColor: '#FDECEC',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#29243D',
  },
  refresh: {
    color: '#7761C8',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    borderRadius: 18,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 35,
    marginBottom: 10,
  },
  emptyText: {
    color: '#29243D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptySubtext: {
    color: '#9993A8',
    marginTop: 6,
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 17,
    marginBottom: 12,
  },
  reminderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  reminderTitle: {
    color: '#29243D',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  status: {
    color: '#B7791F',
    fontSize: 11,
    fontWeight: 'bold',
  },
  completedStatus: {
    color: '#39845A',
  },
  reminderDescription: {
    color: '#777187',
    fontSize: 13,
    marginTop: 8,
  },
  reminderCategory: {
    color: '#7761C8',
    fontSize: 12,
    marginTop: 9,
    textTransform: 'capitalize',
  },
  reminderDate: {
    color: '#514B65',
    fontSize: 13,
    marginTop: 7,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  completeButton: {
    backgroundColor: '#EAF6EE',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  deleteButton: {
    backgroundColor: '#FDECEC',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  actionText: {
    color: '#514B65',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
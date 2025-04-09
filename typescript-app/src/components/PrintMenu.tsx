import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { PrintFormat } from '../services/pdf';

interface PrintMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (format: PrintFormat) => void;
}

export const PrintMenu: React.FC<PrintMenuProps> = ({ visible, onClose, onSelect }) => {
  const theme = useAppTheme();

  const options: { label: string; value: PrintFormat }[] = [
    { label: 'Propers Only', value: 'propers' },
    { label: 'Complete Mass', value: 'full-mass' },
    { label: 'Mass with Rubrics', value: 'mass-with-rubrics' },
    { label: 'Mass with Explanations', value: 'mass-with-explanations' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Print Options
          </Text>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, { borderBottomColor: theme.colors.border }]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.colors.surface }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: theme.colors.error }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  option: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PrintMenu;
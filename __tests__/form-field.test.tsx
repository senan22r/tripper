import { fireEvent, render } from '@testing-library/react-native';
import { FormField } from '../components/ui/form-field';
import { ThemeProvider } from '../context/theme-context';

test('FormField renders label/placeholder and fires onChangeText', () => {
  const onChangeText = jest.fn();

  const { getByText, getByPlaceholderText } = render(
    <ThemeProvider>
      <FormField label="Email" placeholder="you@example.com" value="" onChangeText={onChangeText} />
    </ThemeProvider>
  );

  expect(getByText('Email')).toBeTruthy();

  const input = getByPlaceholderText('you@example.com');
  fireEvent.changeText(input, 'a@b.com');
  expect(onChangeText).toHaveBeenCalledWith('a@b.com');
});


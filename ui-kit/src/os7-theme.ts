import {
  ActionIcon,
  Alert,
  Autocomplete,
  Badge,
  Button,
  Card,
  Checkbox,
  CloseButton,
  ColorInput,
  createTheme,
  Input,
  Modal,
  Menu,
  NavLink,
  NumberInput,
  Paper,
  PasswordInput,
  Select,
  SegmentedControl,
  Switch,
  Table,
  Tabs,
  Textarea,
  TextInput,
  ThemeIcon
} from '@mantine/core';
import { DateInput } from '@mantine/dates';

export const os7Theme = createTheme({
  activeClassName: '',
  colors: {
    os7: [
      '#f2f5fb',
      '#e4e9f4',
      '#cbd4e6',
      '#a4b2cf',
      '#7788af',
      '#566789',
      '#303b57',
      '#151d33',
      '#080d20',
      '#030717'
    ]
  },
  primaryColor: 'os7',
  primaryShade: 8,
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
    fontWeight: '700'
  },
  components: {
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        color: 'os7',
        radius: 'md',
        size: 'lg',
        variant: 'subtle'
      }
    }),
    Alert: Alert.extend({
      defaultProps: {
        radius: 'md'
      }
    }),
    Autocomplete: Autocomplete.extend({
      defaultProps: {
        radius: 'md',
        size: 'md'
      }
    }),
    Badge: Badge.extend({
      defaultProps: {
        radius: 'md',
        variant: 'light'
      }
    }),
    Button: Button.extend({
      defaultProps: {
        color: 'os7',
        radius: 'md',
        size: 'md',
        variant: 'filled'
      }
    }),
    Card: Card.extend({
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
        withBorder: true
      }
    }),
    Checkbox: Checkbox.extend({
      defaultProps: {
        color: 'os7',
        radius: 'sm',
        size: 'md'
      }
    }),
    CloseButton: CloseButton.extend({
      defaultProps: {
        radius: 'md'
      }
    }),
    ColorInput: ColorInput.extend({
      defaultProps: {
        radius: 'md',
        size: 'md'
      }
    }),
    DateInput: DateInput.extend({
      defaultProps: {
        radius: 'md',
        size: 'md',
        valueFormat: 'MMM D, YYYY'
      }
    }),
    Input: Input.extend({
      defaultProps: {
        radius: 'md',
        size: 'md'
      }
    }),
    Menu: Menu.extend({
      defaultProps: {
        shadow: 'md'
      }
    }),
    Modal: Modal.extend({
      defaultProps: {
        centered: true,
        radius: 'lg'
      }
    }),
    NavLink: NavLink.extend({
      defaultProps: {
        variant: 'light'
      },
      styles: {
        label: {
          fontSize: 'inherit'
        },
        root: {
          borderRadius: 'var(--mantine-radius-md)'
        }
      }
    }),
    PasswordInput: PasswordInput.extend({
      defaultProps: {
        radius: 'md',
        size: 'md'
      }
    }),
    NumberInput: NumberInput.extend({
      defaultProps: {
        radius: 'md',
        size: 'md'
      }
    }),
    Paper: Paper.extend({
      defaultProps: {
        radius: 'md'
      }
    }),
    Select: Select.extend({
      defaultProps: {
        radius: 'md',
        size: 'md'
      }
    }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: {
        color: 'os7',
        radius: 'md',
        size: 'md'
      }
    }),
    Switch: Switch.extend({
      defaultProps: {
        color: 'os7'
      }
    }),
    Table: Table.extend({
      defaultProps: {
        fz: 'md'
      }
    }),
    Tabs: Tabs.extend({
      styles: {
        tab: {
          fontSize: 'var(--mantine-font-size-md)'
        },
        tabLabel: {
          fontSize: 'var(--mantine-font-size-md)'
        }
      }
    }),
    Textarea: Textarea.extend({
      defaultProps: {
        autosize: true,
        minRows: 3,
        radius: 'md',
        size: 'md'
      }
    }),
    TextInput: TextInput.extend({
      defaultProps: {
        radius: 'md',
        size: 'md'
      }
    }),
    ThemeIcon: ThemeIcon.extend({
      defaultProps: {
        color: 'os7',
        radius: 'md'
      }
    })
  }
});

'use client';

import {
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  FileButton,
  Group,
  Menu,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
  UnstyledButton
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { ModalTitle } from '@os7/ui-kit/modal-title';
import { Os7Logo, os7Brand } from '@os7/ui-kit/os7-brand';
import {
  CalendarClock,
  CalendarX,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Globe,
  IdCard,
  Inbox,
  MapPin,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Send,
  Settings,
  Trash2
} from 'lucide-react';
import { DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import type { MouseEvent, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import type {
  AvailabilitySlotDto,
  AvailableBookingSlotDto,
  CardSnapshotDto,
  ConsultationRequestDto,
  ExceptionDto
} from './types';
import { CardModeToolbar, type CardMode } from './card-mode-toolbar';

type ProfileForm = {
  photoUrl: string;
  name: string;
  title: string;
  location: string;
  age: number | '';
  contactPhone: string;
  contactEmail: string;
  contactWhatsApp: string;
  contactTelegram: string;
  contactWebsite: string;
  agentChatUrl: string;
  currency: string;
  timeZone: string;
  firstDayOfWeek: number;
  professionalProfile: string;
  expertise: string;
  casesAndResults: string;
  experienceAndAchievements: string;
  collaborationFormats: string;
};

type SlotForm = {
  weekday: string;
  startTime: string;
  endTime: string;
  price: string;
};

type RequestForm = {
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  requestDescription: string;
  status: ConsultationRequestDto['status'];
};

export type CardSection =
  | 'profile'
  | 'contacts'
  | 'book'
  | 'exceptions'
  | 'requests'
  | 'settings';

const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const UI_DELAY = 300;
const WEEKLY_CALENDAR_MIN_COLUMN_WIDTH = 120;
const MIN_CALENDAR_SLOT_HEIGHT = 44;
const TIMELINE_GRID_STYLE = {
  backgroundImage:
    'radial-gradient(var(--mantine-color-gray-2) 1px, transparent 1px)',
  backgroundPosition: '10px 10px',
  backgroundSize: '12px 12px'
};
const TIME_OPTIONS = buildTimeOptions();
const START_TIME_OPTIONS = TIME_OPTIONS.slice(0, -1);
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - $' },
  { value: 'EUR', label: 'EUR - €' },
  { value: 'GBP', label: 'GBP - £' },
  { value: 'RUB', label: 'RUB - ₽' }
];

function profileToForm(profile: CardSnapshotDto['profile']): ProfileForm {
  return {
    photoUrl: profile.photoUrl ?? '',
    name: profile.name ?? '',
    title: profile.title ?? '',
    location: profile.location ?? '',
    age: profile.age ?? '',
    contactPhone: profile.contactPhone ?? '',
    contactEmail: profile.contactEmail ?? '',
    contactWhatsApp: profile.contactWhatsApp ?? '',
    contactTelegram: profile.contactTelegram ?? '',
    contactWebsite: profile.contactWebsite ?? '',
    agentChatUrl: profile.agentChatUrl ?? '',
    currency: profile.currency,
    timeZone: profile.timeZone,
    firstDayOfWeek: profile.firstDayOfWeek ?? 1,
    professionalProfile: profile.professionalProfile ?? '',
    expertise: profile.expertise ?? '',
    casesAndResults: profile.casesAndResults ?? '',
    experienceAndAchievements: profile.experienceAndAchievements ?? '',
    collaborationFormats: profile.collaborationFormats ?? ''
  };
}

function profileVersionKey(profile: CardSnapshotDto['profile']) {
  return `${profile.locale}:${profile.fallbackLocale ?? 'exact'}`;
}

export function CardApp({
  initialMode = 'view',
  initialSection = 'profile',
  initialLocaleLocked = false,
  initialPublicOrigin = '',
  initialSnapshot,
  initialWeekStart
}: {
  initialMode?: CardMode;
  initialSection?: CardSection;
  initialLocaleLocked?: boolean;
  initialPublicOrigin?: string;
  initialSnapshot?: CardSnapshotDto;
  initialWeekStart?: string;
}) {
  const [weekStart, setWeekStart] = useState(
    () =>
      initialWeekStart ??
      formatDateOnly(
        startOfWeek(new Date(), initialSnapshot?.profile.firstDayOfWeek ?? 1)
      )
  );
  const [calendarWeekStart, setCalendarWeekStart] = useState(weekStart);
  const [snapshot, setSnapshot] = useState<CardSnapshotDto | null>(
    initialSnapshot ?? null
  );
  const [loading, setLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialSnapshot) {
      return;
    }

    setSnapshot(initialSnapshot);
    setLoading(false);
    setError(null);

    if (initialWeekStart) {
      setWeekStart(initialWeekStart);
      setCalendarWeekStart(initialWeekStart);
    }
  }, [
    initialSnapshot,
    initialSnapshot?.profile.locale,
    initialSnapshot?.profile.fallbackLocale,
    initialWeekStart
  ]);

  const refresh = useCallback(
    async (nextWeekStart = calendarWeekStart) => {
      const response = await fetch(`/api/card?weekStart=${nextWeekStart}`, {
        cache: 'no-store'
      });
      const payload = await response.json();

      if (!payload.ok) {
        startTransition(() => {
          setError(payload.error.message);
          setLoading(false);
        });
        return;
      }

      startTransition(() => {
        setCalendarWeekStart(nextWeekStart);
        setSnapshot(payload.data);
        setError(null);
        setLoading(false);
      });
    },
    [calendarWeekStart]
  );

  useEffect(() => {
    const source = new EventSource('/api/card/events');

    source.addEventListener('card.changed', () => {
      void refresh();
    });

    return () => {
      source.close();
    };
  }, [refresh]);

  async function changeWeek(nextWeekStart: string) {
    setWeekStart(nextWeekStart);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      try {
        const response = await fetch(`/api/card?weekStart=${weekStart}`, {
          cache: 'no-store'
        });
        const payload = await response.json();

        if (cancelled) {
          return;
        }

        startTransition(() => {
          if (payload.ok) {
            setCalendarWeekStart(weekStart);
            setSnapshot(payload.data);
            setError(null);
          } else {
            setError(payload.error.message);
          }

          setLoading(false);
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setError(error instanceof Error ? error.message : 'Failed to load');
          setLoading(false);
        });
      }
    }

    loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  if (loading) {
    return (
      <Container py="xl" size="lg">
        <Stack>
          <Skeleton h={72} radius="md" />
          <Skeleton h={360} radius="md" />
          <Skeleton h={220} radius="md" />
        </Stack>
      </Container>
    );
  }

  if (error || !snapshot) {
    return (
      <Container py="xl" size="sm">
        <Alert color="red">{error ?? 'Failed to load card'}</Alert>
      </Container>
    );
  }

  return (
    <Container size="md" py={{ base: 'md', sm: 'xl' }}>
      <PublicCard
        initialMode={initialMode}
        localeLocked={initialLocaleLocked}
        section={initialSection}
        weekStart={calendarWeekStart}
        snapshot={snapshot}
        publicOrigin={initialPublicOrigin}
        onBooked={refresh}
        onChanged={refresh}
        onWeekChange={changeWeek}
      />
    </Container>
  );
}

function PublicCard({
  onBooked,
  onChanged,
  onWeekChange,
  initialMode,
  localeLocked,
  section,
  snapshot,
  publicOrigin,
  weekStart
}: {
  initialMode: CardMode;
  localeLocked: boolean;
  section: CardSection;
  snapshot: CardSnapshotDto;
  publicOrigin: string;
  weekStart: string;
  onBooked: () => Promise<void>;
  onChanged: () => Promise<void>;
  onWeekChange: (weekStart: string) => Promise<void>;
}) {
  const router = useRouter();
  const t = useTranslations('App');
  const fields = useTranslations('Fields');
  const localeText = useTranslations('LocaleSwitcher');
  const sections = useTranslations('Sections');
  const exceptionsText = useTranslations('Exceptions');
  const requestsText = useTranslations('Requests');
  const settingsText = useTranslations('Settings');
  const locale = useLocale();
  const timeZoneOptions = buildTimeZoneOptions();
  const firstDayOptions = buildFirstDayOptions(locale);
  const [sectionState, setSectionState] = useState({
    currentSection: section,
    routeSection: section
  });
  const currentSection =
    sectionState.routeSection === section
      ? sectionState.currentSection
      : section;
  const [selectedSlot, setSelectedSlot] =
    useState<AvailableBookingSlotDto | null>(null);
  const mode = snapshot.isAdmin ? initialMode : 'view';
  const editMode = snapshot.isAdmin && mode === 'edit';
  const [visitorTimeZone, setVisitorTimeZone] = useState<string | null>(null);
  const viewTimeZone = visitorTimeZone ?? snapshot.profile.timeZone;
  const displayTimeZone = editMode ? snapshot.profile.timeZone : viewTimeZone;
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form, setForm] = useState<ProfileForm>(() =>
    profileToForm(snapshot.profile)
  );
  const [hasUnsavedProfileChanges, setHasUnsavedProfileChanges] =
    useState(false);
  const previousProfileSnapshot = useRef(snapshot.profile);
  const [slotForm, setSlotForm] = useState<SlotForm>({
    weekday: '1',
    startTime: '10:00',
    endTime: '11:00',
    price: ''
  });
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotModalOpened, setSlotModalOpened] = useState(false);
  const [slotSaving, setSlotSaving] = useState(false);
  const [slotDeleting, setSlotDeleting] = useState(false);
  const [exception, setException] = useState({ date: '', note: '' });
  const [exceptionModalOpened, setExceptionModalOpened] = useState(false);
  const [exceptionSaving, setExceptionSaving] = useState(false);
  const [deletingExceptionId, setDeletingExceptionId] = useState<string | null>(
    null
  );
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [requestSaving, setRequestSaving] = useState(false);
  const [translationDeleting, setTranslationDeleting] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestForm>({
    visitorName: '',
    visitorEmail: '',
    visitorPhone: '',
    requestDescription: '',
    status: 'NEW'
  });
  const previousWeekStart = formatDateOnly(
    addDays(parseDateOnly(weekStart), -7)
  );
  const nextWeekStart = formatDateOnly(addDays(parseDateOnly(weekStart), 7));
  const publicMcpUrl = publicOrigin
    ? `${publicOrigin}/api/public/mcp`
    : '/api/public/mcp';
  const runAgentUrl = publicOrigin ? `${publicOrigin}/run-agent` : '/run-agent';
  const displayProfile = editMode
    ? {
        photoUrl: form.photoUrl || null,
        name: form.name || null,
        title: form.title || null,
        location: form.location || null,
        age: form.age === '' ? null : form.age,
        contactPhone: form.contactPhone || null,
        contactEmail: form.contactEmail || null,
        contactWhatsApp: form.contactWhatsApp || null,
        contactTelegram: form.contactTelegram || null,
        contactWebsite: form.contactWebsite || null,
        agentChatUrl: form.agentChatUrl || null,
        currency: form.currency,
        timeZone: form.timeZone,
        firstDayOfWeek: form.firstDayOfWeek ?? 1,
        professionalProfile: form.professionalProfile || null,
        expertise: form.expertise || null,
        casesAndResults: form.casesAndResults || null,
        experienceAndAchievements: form.experienceAndAchievements || null,
        collaborationFormats: form.collaborationFormats || null
      }
    : snapshot.profile;

  useEffect(() => {
    const previousProfile = previousProfileSnapshot.current;

    if (previousProfile === snapshot.profile) {
      return;
    }

    previousProfileSnapshot.current = snapshot.profile;

    if (
      profileVersionKey(previousProfile) ===
        profileVersionKey(snapshot.profile) &&
      hasUnsavedProfileChanges
    ) {
      return;
    }

    setForm(profileToForm(snapshot.profile));
    setHasUnsavedProfileChanges(false);
  }, [hasUnsavedProfileChanges, snapshot.profile]);

  useEffect(() => {
    if (!snapshot.isAdmin) {
      return;
    }

    router.prefetch(sectionHref(section, true));
    router.prefetch(sectionHref(publicSectionFor(section), false));
  }, [router, section, snapshot.isAdmin]);

  useEffect(() => {
    if (editMode) {
      return;
    }

    const timer = window.setTimeout(() => {
      const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (detectedTimeZone) {
        setVisitorTimeZone(detectedTimeZone);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [editMode]);

  useEffect(() => {
    function handlePopState() {
      setSectionState({
        currentSection: sectionFromPath(window.location.pathname),
        routeSection: section
      });
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [section]);

  function navigateSection(
    event: MouseEvent<HTMLAnchorElement>,
    nextSection: CardSection,
    href: string
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    if (window.location.pathname !== href) {
      window.history.pushState(null, '', href);
    }
    setSectionState({ currentSection: nextSection, routeSection: section });
  }

  const saveProfile = useCallback(
    async ({
      complete = false,
      refresh = true
    }: {
      complete?: boolean;
      refresh?: boolean;
    } = {}) => {
      setSaving(true);
      try {
        await Promise.all([
          api('/api/admin/profile', {
            method: 'PATCH',
            body: {
              ...form,
              photoUrl: form.photoUrl || null,
              agentChatUrl: form.agentChatUrl || null,
              age: form.age === '' ? null : form.age,
              onboardingStep: complete ? 'COMPLETE' : undefined
            }
          }),
          delay(UI_DELAY)
        ]);
        setHasUnsavedProfileChanges(false);

        if (refresh) {
          await onChanged();
        }
      } catch {
        // api() already shows the error notification.
      } finally {
        setSaving(false);
      }
    },
    [form, onChanged]
  );

  useEffect(() => {
    if (!editMode || !hasUnsavedProfileChanges || !form.name.trim()) {
      return;
    }

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      void saveProfile({ refresh: false });
    }, 700);

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [editMode, form.name, hasUnsavedProfileChanges, saveProfile]);

  function updateProfileField<K extends keyof ProfileForm>(
    field: K,
    value: ProfileForm[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setHasUnsavedProfileChanges(true);
  }

  function flushProfileSave() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    if (!editMode || !hasUnsavedProfileChanges || !form.name.trim()) {
      return;
    }

    void saveProfile({ refresh: false });
  }

  async function changeSetting(
    field: 'currency' | 'timeZone' | 'firstDayOfWeek' | 'agentChatUrl',
    value: number | string | null
  ) {
    setForm((current) => ({
      ...current,
      [field]: field === 'agentChatUrl' ? (value ?? '') : value
    }));
    setSaving(true);

    try {
      await Promise.all([
        api('/api/admin/profile', {
          method: 'PATCH',
          body: { [field]: value }
        }),
        delay(UI_DELAY)
      ]);
      if (field === 'firstDayOfWeek') {
        await onWeekChange(
          formatDateOnly(startOfWeek(new Date(), Number(value)))
        );
      } else {
        await onChanged();
      }
    } catch {
      // api() already shows the error notification.
    } finally {
      setSaving(false);
    }
  }

  async function changeMode(value: string) {
    const nextMode = value as CardMode;
    if (nextMode === mode) {
      return;
    }

    if (nextMode === 'print') {
      if (mode === 'edit' && hasUnsavedProfileChanges && form.name.trim()) {
        await saveProfile({ refresh: false });
      }
      router.push('/print');
      return;
    }

    if (nextMode === 'edit') {
      router.push(sectionHref(currentSection, true));
      return;
    }

    if (
      mode === 'edit' &&
      nextMode === 'view' &&
      hasUnsavedProfileChanges &&
      form.name.trim()
    ) {
      await saveProfile({ refresh: false });
    }

    router.push(sectionHref(publicSectionFor(currentSection), false));
  }

  async function uploadPhoto(file: File | null) {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.set('file', file);
    const response = await fetch('/api/admin/photo', {
      method: 'POST',
      body: formData
    });
    const payload = await response.json();

    if (!payload.ok) {
      notifications.show({ color: 'red', message: payload.error.message });
      return;
    }

    setForm({ ...form, photoUrl: payload.data.photoUrl });
    setHasUnsavedProfileChanges(false);
    await onChanged();
  }

  function openAddSlotModal(weekday = 1) {
    setEditingSlotId(null);
    setSlotForm({
      weekday: String(weekday),
      startTime: '10:00',
      endTime: '11:00',
      price: ''
    });
    setSlotModalOpened(true);
  }

  function openEditSlotModal(slot: AvailabilitySlotDto) {
    setEditingSlotId(slot.id);
    setSlotForm({
      weekday: String(slot.weekday),
      startTime: slot.startTime,
      endTime: slot.endTime,
      price: slot.price == null ? '' : String(slot.price)
    });
    setSlotModalOpened(true);
  }

  async function saveSlot() {
    setSlotSaving(true);
    try {
      await Promise.all([
        api(
          editingSlotId
            ? `/api/admin/availability/${editingSlotId}`
            : '/api/admin/availability',
          {
            method: editingSlotId ? 'PATCH' : 'POST',
            body: {
              weekday: Number(slotForm.weekday),
              startTime: slotForm.startTime,
              endTime: slotForm.endTime,
              price: slotForm.price === '' ? null : Number(slotForm.price)
            }
          }
        ),
        delay(UI_DELAY)
      ]);
      setSlotModalOpened(false);
      await onChanged();
    } catch {
      // api() already shows the error notification.
    } finally {
      setSlotSaving(false);
    }
  }

  async function deleteEditingSlot() {
    if (!editingSlotId) {
      return;
    }

    setSlotDeleting(true);
    try {
      await Promise.all([deleteSlot(editingSlotId), delay(UI_DELAY)]);
      setSlotModalOpened(false);
      setEditingSlotId(null);
    } catch {
      // api() already shows the error notification.
    } finally {
      setSlotDeleting(false);
    }
  }

  async function deleteSlot(id: string) {
    await api(`/api/admin/availability/${id}`, { method: 'DELETE' });
    await onChanged();
  }

  async function addException() {
    if (!exception.date) {
      return;
    }

    setExceptionSaving(true);
    try {
      await Promise.all([
        api('/api/admin/exceptions', {
          method: 'POST',
          body: {
            date: exception.date,
            note: exception.note || null
          }
        }),
        delay(UI_DELAY)
      ]);
      setException({ date: '', note: '' });
      setExceptionModalOpened(false);
      await onChanged();
    } catch {
      // api() already shows the error notification.
    } finally {
      setExceptionSaving(false);
    }
  }

  async function deleteException(id: string) {
    setDeletingExceptionId(id);
    try {
      await Promise.all([
        api(`/api/admin/exceptions/${id}`, { method: 'DELETE' }),
        delay(UI_DELAY)
      ]);
      await onChanged();
    } catch {
      // api() already shows the error notification.
    } finally {
      setDeletingExceptionId(null);
    }
  }

  function openRequestModal(request: ConsultationRequestDto) {
    setEditingRequestId(request.id);
    setRequestForm({
      visitorName: request.visitorName,
      visitorEmail: request.visitorEmail,
      visitorPhone: request.visitorPhone,
      requestDescription: request.requestDescription,
      status: request.status
    });
  }

  async function saveRequest() {
    if (!editingRequestId) {
      return;
    }

    setRequestSaving(true);
    try {
      await Promise.all([
        api(`/api/admin/requests/${editingRequestId}`, {
          method: 'PATCH',
          body: {
            visitorName: requestForm.visitorName.trim(),
            visitorEmail: requestForm.visitorEmail.trim(),
            visitorPhone: requestForm.visitorPhone.trim(),
            requestDescription: requestForm.requestDescription.trim(),
            status: requestForm.status
          }
        }),
        delay(UI_DELAY)
      ]);
      setEditingRequestId(null);
      await onChanged();
    } catch {
      // api() already shows the error notification.
    } finally {
      setRequestSaving(false);
    }
  }

  async function deleteCurrentTranslation() {
    if (hasUnsavedProfileChanges && form.name.trim()) {
      await saveProfile({ refresh: false });
    }

    setTranslationDeleting(true);
    try {
      await Promise.all([
        api('/api/admin/profile/translation', { method: 'DELETE' }),
        delay(UI_DELAY)
      ]);
      await onChanged();
    } catch {
      // api() already shows the error notification.
    } finally {
      setTranslationDeleting(false);
    }
  }

  async function copyPublicMcpUrl() {
    await navigator.clipboard.writeText(publicMcpUrl);
    setMcpCopied(true);
    window.setTimeout(() => setMcpCopied(false), 1600);
  }

  return (
    <Stack gap="sm">
      <CardModeToolbar
        activeLocale={snapshot.profile.locale}
        isAdmin={snapshot.isAdmin}
        localeLocked={localeLocked}
        mode={mode}
        onModeChange={changeMode}
        saving={saving}
      />

      <Paper withBorder p={{ base: 'md', sm: 'xl' }} radius="md">
        <Stack gap="lg">
          <Group align="flex-start" gap="md" wrap="wrap">
            {editMode ? (
              <FileButton
                onChange={uploadPhoto}
                accept="image/png,image/jpeg,image/webp"
              >
                {(props) => (
                  <Box
                    component="button"
                    {...props}
                    aria-label="Upload photo"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onClick?.();
                    }}
                    style={{
                      background: 'transparent',
                      border: 0,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <Avatar
                      src={displayProfile.photoUrl}
                      size={96}
                      radius="50%"
                    >
                      {displayProfile.name?.slice(0, 1) ?? 'G'}
                    </Avatar>
                  </Box>
                )}
              </FileButton>
            ) : (
              <Avatar src={displayProfile.photoUrl} size={96} radius="50%">
                {displayProfile.name?.slice(0, 1) ?? 'G'}
              </Avatar>
            )}
            <Box style={{ flex: 1, minWidth: 0 }}>
              {editMode ? (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  <TextInput
                    aria-label={fields('name')}
                    required
                    placeholder={fields('name')}
                    value={form.name}
                    onBlur={flushProfileSave}
                    onChange={(event) =>
                      updateProfileField('name', event.currentTarget.value)
                    }
                  />
                  <TextInput
                    aria-label={fields('title')}
                    placeholder={fields('title')}
                    value={form.title}
                    onBlur={flushProfileSave}
                    onChange={(event) =>
                      updateProfileField('title', event.currentTarget.value)
                    }
                  />
                  <TextInput
                    aria-label={fields('location')}
                    placeholder={fields('location')}
                    value={form.location}
                    onBlur={flushProfileSave}
                    onChange={(event) =>
                      updateProfileField('location', event.currentTarget.value)
                    }
                  />
                  <NumberInput
                    aria-label={fields('age')}
                    placeholder={fields('age')}
                    min={1}
                    max={120}
                    value={form.age}
                    onBlur={flushProfileSave}
                    onChange={(value) =>
                      updateProfileField(
                        'age',
                        typeof value === 'number' ? value : ''
                      )
                    }
                  />
                </SimpleGrid>
              ) : (
                <Box>
                  <Title order={2}>{displayProfile.name ?? 'Your name'}</Title>
                  {displayProfile.title ? (
                    <MarkdownText value={displayProfile.title} compact />
                  ) : null}
                  {displayProfile.location ? (
                    <Group c="dimmed" gap={4}>
                      <MapPin size={13} />
                      <Text c="dimmed" size="sm">
                        {displayProfile.location}
                      </Text>
                    </Group>
                  ) : null}
                  {displayProfile.age ? (
                    <Text c="dimmed" size="sm">
                      {displayProfile.age} yo
                    </Text>
                  ) : null}
                </Box>
              )}
            </Box>
            {!editMode && displayProfile.agentChatUrl ? (
              <>
                <Group
                  align="center"
                  gap="xs"
                  hiddenFrom="sm"
                  justify="space-between"
                  mt="sm"
                  w="100%"
                  wrap="nowrap"
                >
                  <Button
                    component="a"
                    href="/run-agent"
                    leftSection={<Bot size={16} />}
                    size="md"
                    style={{ flex: '1 1 auto' }}
                  >
                    {t('agent')}
                  </Button>
                  <Box style={{ flex: '0 0 auto' }}>
                    <AgentQrCode
                      label={t('agentQr')}
                      size={56}
                      value={runAgentUrl}
                    />
                  </Box>
                </Group>
                <Stack align="center" gap="xs" ml="auto" visibleFrom="sm">
                  <AgentQrCode label={t('agentQr')} value={runAgentUrl} />
                  <Button
                    component="a"
                    href="/run-agent"
                    leftSection={<Bot size={16} />}
                    size="xs"
                  >
                    {t('agent')}
                  </Button>
                </Stack>
              </>
            ) : null}
          </Group>

          <Tabs value={currentSection}>
            <Tabs.List>
              <Tabs.Tab
                value="profile"
                leftSection={<IdCard size={16} />}
                renderRoot={(props) => (
                  <Link
                    href={sectionHref('profile', editMode)}
                    {...props}
                    onClick={(event) =>
                      navigateSection(
                        event,
                        'profile',
                        sectionHref('profile', editMode)
                      )
                    }
                  />
                )}
              >
                {t('profile')}
              </Tabs.Tab>
              {editMode ? (
                <>
                  <Tabs.Tab
                    value="contacts"
                    leftSection={<Mail size={16} />}
                    renderRoot={(props) => (
                      <Link
                        href={sectionHref('contacts', editMode)}
                        {...props}
                        onClick={(event) =>
                          navigateSection(
                            event,
                            'contacts',
                            sectionHref('contacts', editMode)
                          )
                        }
                      />
                    )}
                  >
                    {sections('contacts')}
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="book"
                    leftSection={<CalendarClock size={16} />}
                    renderRoot={(props) => (
                      <Link
                        href={sectionHref('book', editMode)}
                        {...props}
                        onClick={(event) =>
                          navigateSection(
                            event,
                            'book',
                            sectionHref('book', editMode)
                          )
                        }
                      />
                    )}
                  >
                    {sections('availability')}
                  </Tabs.Tab>
                </>
              ) : (
                <>
                  <Tabs.Tab
                    value="book"
                    leftSection={<CalendarClock size={16} />}
                    renderRoot={(props) => (
                      <Link
                        href={sectionHref('book', editMode)}
                        {...props}
                        onClick={(event) =>
                          navigateSection(
                            event,
                            'book',
                            sectionHref('book', editMode)
                          )
                        }
                      />
                    )}
                  >
                    {t('book')}
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="contacts"
                    leftSection={<Mail size={16} />}
                    renderRoot={(props) => (
                      <Link
                        href={sectionHref('contacts', editMode)}
                        {...props}
                        onClick={(event) =>
                          navigateSection(
                            event,
                            'contacts',
                            sectionHref('contacts', editMode)
                          )
                        }
                      />
                    )}
                  >
                    {sections('contacts')}
                  </Tabs.Tab>
                </>
              )}
              {editMode ? (
                <>
                  <Tabs.Tab
                    value="exceptions"
                    leftSection={<CalendarX size={16} />}
                    renderRoot={(props) => (
                      <Link
                        href={sectionHref('exceptions', true)}
                        {...props}
                        onClick={(event) =>
                          navigateSection(
                            event,
                            'exceptions',
                            sectionHref('exceptions', true)
                          )
                        }
                      />
                    )}
                  >
                    {sections('exceptions')}
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="requests"
                    leftSection={<Inbox size={16} />}
                    renderRoot={(props) => (
                      <Link
                        href={sectionHref('requests', true)}
                        {...props}
                        onClick={(event) =>
                          navigateSection(
                            event,
                            'requests',
                            sectionHref('requests', true)
                          )
                        }
                      />
                    )}
                  >
                    <Group gap={6} wrap="nowrap">
                      <span>{sections('requests')}</span>
                      <Badge size="xs" variant="light">
                        {snapshot.consultationRequests?.length ?? 0}
                      </Badge>
                    </Group>
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="settings"
                    leftSection={<Settings size={16} />}
                    renderRoot={(props) => (
                      <Link
                        href={sectionHref('settings', true)}
                        {...props}
                        onClick={(event) =>
                          navigateSection(
                            event,
                            'settings',
                            sectionHref('settings', true)
                          )
                        }
                      />
                    )}
                  >
                    {sections('settings')}
                  </Tabs.Tab>
                </>
              ) : null}
            </Tabs.List>

            {currentSection === 'profile' ? (
              <Box pt="lg">
                <Stack gap="lg">
                  {editMode ? (
                    <Alert color="blue" radius="md" variant="light">
                      <Group justify="space-between" gap="sm">
                        <Text size="sm">
                          {t('editingLanguage', {
                            language: localeText(snapshot.profile.locale)
                          })}
                        </Text>
                        <Button
                          color="red"
                          disabled={snapshot.profile.fallbackLocale !== null}
                          loading={translationDeleting}
                          size="xs"
                          variant="light"
                          onClick={deleteCurrentTranslation}
                        >
                          {t('deleteTranslation')}
                        </Button>
                      </Group>
                      {snapshot.profile.fallbackLocale ? (
                        <Text c="dimmed" mt={4} size="xs">
                          {t('translationFallback', {
                            language: localeText(
                              snapshot.profile.fallbackLocale
                            )
                          })}
                        </Text>
                      ) : null}
                    </Alert>
                  ) : null}
                  <EditableContentSection
                    editMode={editMode}
                    title={sections('professionalProfile')}
                    value={displayProfile.professionalProfile}
                    inputValue={form.professionalProfile}
                    placeholder={fields('professionalProfile')}
                    onBlur={flushProfileSave}
                    onChange={(value) =>
                      updateProfileField('professionalProfile', value)
                    }
                  />
                  <EditableContentSection
                    editMode={editMode}
                    title={sections('expertise')}
                    value={displayProfile.expertise}
                    inputValue={form.expertise}
                    placeholder={fields('expertise')}
                    onBlur={flushProfileSave}
                    onChange={(value) => updateProfileField('expertise', value)}
                  />
                  <EditableContentSection
                    editMode={editMode}
                    title={sections('casesAndResults')}
                    value={displayProfile.casesAndResults}
                    inputValue={form.casesAndResults}
                    placeholder={fields('casesAndResults')}
                    onBlur={flushProfileSave}
                    onChange={(value) =>
                      updateProfileField('casesAndResults', value)
                    }
                  />
                  <EditableContentSection
                    editMode={editMode}
                    title={sections('experienceAndAchievements')}
                    value={displayProfile.experienceAndAchievements}
                    inputValue={form.experienceAndAchievements}
                    placeholder={fields('experienceAndAchievements')}
                    onBlur={flushProfileSave}
                    onChange={(value) =>
                      updateProfileField('experienceAndAchievements', value)
                    }
                  />
                  <EditableContentSection
                    editMode={editMode}
                    title={sections('collaborationFormats')}
                    value={displayProfile.collaborationFormats}
                    inputValue={form.collaborationFormats}
                    placeholder={fields('collaborationFormats')}
                    onBlur={flushProfileSave}
                    onChange={(value) =>
                      updateProfileField('collaborationFormats', value)
                    }
                  />
                </Stack>
              </Box>
            ) : null}

            {currentSection === 'contacts' ? (
              <Box pt="lg">
                {editMode ? (
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <TextInput
                      label={fields('contactPhone')}
                      value={form.contactPhone}
                      onBlur={flushProfileSave}
                      onChange={(event) =>
                        updateProfileField(
                          'contactPhone',
                          event.currentTarget.value
                        )
                      }
                    />
                    <TextInput
                      label={fields('contactEmail')}
                      value={form.contactEmail}
                      onBlur={flushProfileSave}
                      onChange={(event) =>
                        updateProfileField(
                          'contactEmail',
                          event.currentTarget.value
                        )
                      }
                    />
                    <TextInput
                      label={fields('contactWhatsApp')}
                      value={form.contactWhatsApp}
                      onBlur={flushProfileSave}
                      onChange={(event) =>
                        updateProfileField(
                          'contactWhatsApp',
                          event.currentTarget.value
                        )
                      }
                    />
                    <TextInput
                      label={fields('contactTelegram')}
                      value={form.contactTelegram}
                      onBlur={flushProfileSave}
                      onChange={(event) =>
                        updateProfileField(
                          'contactTelegram',
                          event.currentTarget.value
                        )
                      }
                    />
                    <TextInput
                      label={fields('contactWebsite')}
                      value={form.contactWebsite}
                      onBlur={flushProfileSave}
                      onChange={(event) =>
                        updateProfileField(
                          'contactWebsite',
                          event.currentTarget.value
                        )
                      }
                    />
                  </SimpleGrid>
                ) : (
                  <Stack gap="sm">
                    <ContactLink
                      icon={<Phone size={16} />}
                      label={fields('contactPhone')}
                      href={phoneHref(displayProfile.contactPhone)}
                      value={displayProfile.contactPhone}
                    />
                    <ContactLink
                      icon={<Mail size={16} />}
                      label={fields('contactEmail')}
                      href={emailHref(displayProfile.contactEmail)}
                      value={displayProfile.contactEmail}
                    />
                    <ContactLink
                      icon={<MessageCircle size={16} />}
                      label={fields('contactWhatsApp')}
                      href={whatsAppHref(displayProfile.contactWhatsApp)}
                      value={displayProfile.contactWhatsApp}
                    />
                    <ContactLink
                      icon={<Send size={16} />}
                      label={fields('contactTelegram')}
                      href={telegramHref(displayProfile.contactTelegram)}
                      value={displayProfile.contactTelegram}
                    />
                    <ContactLink
                      icon={<Globe size={16} />}
                      label={fields('contactWebsite')}
                      href={websiteHref(displayProfile.contactWebsite)}
                      value={displayProfile.contactWebsite}
                    />
                  </Stack>
                )}
              </Box>
            ) : null}

            {currentSection === 'book' ? (
              <Box pt="lg">
                <Stack gap="lg">
                  {snapshot.profile.showAvailability && !editMode ? (
                    <Stack>
                      <Group justify="space-between" align="end">
                        <Select
                          aria-label={fields('timeZone')}
                          data={timeZoneOptions}
                          searchable
                          value={displayTimeZone}
                          w={{ base: '100%', sm: 320 }}
                          onChange={(value) => {
                            if (value) {
                              setVisitorTimeZone(value);
                            }
                          }}
                        />
                        <Group gap="xs">
                          <Button
                            variant="subtle"
                            leftSection={<ChevronLeft size={16} />}
                            onClick={() => onWeekChange(previousWeekStart)}
                          >
                            {t('previousWeek')}
                          </Button>
                          <Button
                            variant="subtle"
                            rightSection={<ChevronRight size={16} />}
                            onClick={() => onWeekChange(nextWeekStart)}
                          >
                            {t('nextWeek')}
                          </Button>
                        </Group>
                      </Group>
                      <WeeklyBookingCalendar
                        weekStart={weekStart}
                        exceptions={snapshot.exceptions}
                        locale={locale}
                        slots={snapshot.availableBookingSlots}
                        timeZone={displayTimeZone}
                        onSelectSlot={setSelectedSlot}
                      />
                    </Stack>
                  ) : null}

                  {snapshot.profile.showAvailability && editMode ? (
                    <Stack>
                      <WeeklyAdminCalendar
                        addLabel={t('addSlot')}
                        currency={snapshot.profile.currency}
                        locale={locale}
                        weekStart={weekStart}
                        slots={snapshot.availabilitySlots}
                        onAddSlot={openAddSlotModal}
                        onEditSlot={openEditSlotModal}
                      />
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            ) : null}

            {currentSection === 'exceptions' && editMode ? (
              <Box pt="lg">
                <Stack gap="lg">
                  <Group justify="flex-end">
                    <Button
                      leftSection={<Plus size={16} />}
                      onClick={() => setExceptionModalOpened(true)}
                    >
                      {t('add')}
                    </Button>
                  </Group>
                  <DataTable<ExceptionDto>
                    borderRadius="md"
                    highlightOnHover
                    idAccessor="id"
                    minHeight={
                      snapshot.exceptions.length === 0 ? 140 : undefined
                    }
                    noRecordsText={exceptionsText('empty')}
                    records={snapshot.exceptions}
                    withTableBorder
                    columns={[
                      {
                        accessor: 'date',
                        title: fields('date'),
                        render: (exception) => (
                          <Text fw={600}>{exception.date}</Text>
                        )
                      },
                      {
                        accessor: 'note',
                        title: fields('note'),
                        render: (exception) => (
                          <Text c="dimmed">{exception.note || '-'}</Text>
                        )
                      },
                      {
                        accessor: 'actions',
                        title: '',
                        textAlign: 'right',
                        render: (exception) => (
                          <ActionIcon
                            color="red"
                            loading={deletingExceptionId === exception.id}
                            variant="subtle"
                            onClick={() => deleteException(exception.id)}
                          >
                            <Trash2 size={16} />
                          </ActionIcon>
                        )
                      }
                    ]}
                  />
                </Stack>
              </Box>
            ) : null}

            {currentSection === 'requests' && editMode ? (
              <Box pt="lg">
                <DataTable<ConsultationRequestDto>
                  borderRadius="md"
                  highlightOnHover
                  idAccessor="id"
                  minHeight={
                    (snapshot.consultationRequests ?? []).length === 0
                      ? 140
                      : undefined
                  }
                  noRecordsText={requestsText('empty')}
                  onRowClick={({ record }) => openRequestModal(record)}
                  records={snapshot.consultationRequests ?? []}
                  withTableBorder
                  columns={[
                    {
                      accessor: 'visitorName',
                      title: fields('visitorName'),
                      render: (request) => (
                        <Text fw={600}>{request.visitorName}</Text>
                      )
                    },
                    {
                      accessor: 'contact',
                      title: requestsText('contact'),
                      render: (request) => (
                        <Stack gap={2}>
                          <Text size="sm">{request.visitorEmail}</Text>
                          <Text c="dimmed" size="xs">
                            {request.visitorPhone}
                          </Text>
                        </Stack>
                      )
                    },
                    {
                      accessor: 'slot',
                      title: requestsText('slot'),
                      render: (request) => (
                        <Text size="sm">
                          {formatRange(
                            request.requestedStartAt,
                            request.requestedEndAt,
                            snapshot.profile.timeZone
                          )}
                        </Text>
                      )
                    },
                    {
                      accessor: 'status',
                      title: requestsText('status'),
                      render: (request) => (
                        <Badge variant="light">
                          {formatRequestStatus(request.status, requestsText)}
                        </Badge>
                      )
                    }
                  ]}
                />
              </Box>
            ) : null}

            {currentSection === 'settings' && editMode ? (
              <Box pt="lg">
                <Stack gap="xl">
                  <Stack maw={420}>
                    <Select
                      allowDeselect={false}
                      data={CURRENCY_OPTIONS}
                      label={fields('currency')}
                      value={form.currency}
                      onChange={(value) => {
                        if (value) {
                          void changeSetting('currency', value);
                        }
                      }}
                    />
                    <Select
                      allowDeselect={false}
                      data={timeZoneOptions}
                      label={fields('timeZone')}
                      searchable
                      value={form.timeZone}
                      onChange={(value) => {
                        if (value) {
                          void changeSetting('timeZone', value);
                        }
                      }}
                    />
                    <Select
                      allowDeselect={false}
                      data={firstDayOptions}
                      label={fields('firstDayOfWeek')}
                      value={String(form.firstDayOfWeek ?? 1)}
                      onChange={(value) => {
                        if (value) {
                          void changeSetting('firstDayOfWeek', Number(value));
                        }
                      }}
                    />
                    <TextInput
                      label={fields('agentChatUrl')}
                      placeholder="https://chatgpt.com/g/..."
                      value={form.agentChatUrl}
                      onBlur={(event) => {
                        void changeSetting(
                          'agentChatUrl',
                          event.currentTarget.value.trim() || null
                        );
                      }}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setForm((current) => ({
                          ...current,
                          agentChatUrl: value
                        }));
                      }}
                    />
                  </Stack>

                  <Stack gap="sm">
                    <Box>
                      <Title order={3}>{settingsText('publicMcpTitle')}</Title>
                      <Text c="dimmed" mt={4} size="sm">
                        {settingsText('publicMcpDescription')}
                      </Text>
                    </Box>
                    <Group align="end" gap="xs">
                      <TextInput
                        readOnly
                        label={settingsText('publicMcpEndpoint')}
                        value={publicMcpUrl}
                        style={{ flex: '1 1 280px' }}
                      />
                      <Button
                        leftSection={<Copy size={16} />}
                        variant="light"
                        onClick={copyPublicMcpUrl}
                      >
                        {mcpCopied
                          ? settingsText('copied')
                          : settingsText('copy')}
                      </Button>
                    </Group>
                    <Alert color="gray" radius="md" variant="light">
                      <Stack gap={6}>
                        <Text size="sm">{settingsText('publicMcpSetup')}</Text>
                        <Text c="dimmed" size="sm">
                          {settingsText('publicMcpNoAuth')}
                        </Text>
                        <Text c="dimmed" size="sm">
                          {settingsText('publicMcpTools')}
                        </Text>
                      </Stack>
                    </Alert>
                  </Stack>
                </Stack>
              </Box>
            ) : null}
          </Tabs>
        </Stack>
      </Paper>

      <BookingModal
        currency={snapshot.profile.currency}
        timeZone={displayTimeZone}
        slot={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        onBooked={async () => {
          setSelectedSlot(null);
          await onBooked();
        }}
      />
      <AvailabilitySlotModal
        form={slotForm}
        deleting={slotDeleting}
        locale={locale}
        opened={slotModalOpened}
        saving={slotSaving}
        title={editingSlotId ? t('editSlot') : t('addSlot')}
        onChange={setSlotForm}
        onClose={() => setSlotModalOpened(false)}
        onDelete={editingSlotId ? deleteEditingSlot : undefined}
        onSave={saveSlot}
      />
      <ExceptionModal
        form={exception}
        opened={exceptionModalOpened}
        saving={exceptionSaving}
        title={sections('exceptions')}
        onChange={setException}
        onClose={() => setExceptionModalOpened(false)}
        onSave={addException}
      />
      <RequestModal
        form={requestForm}
        opened={Boolean(editingRequestId)}
        saving={requestSaving}
        onChange={setRequestForm}
        onClose={() => setEditingRequestId(null)}
        onSave={saveRequest}
      />
      <Group justify="space-between" py="xs">
        <Text c="dimmed" size="xs">
          {t('footer')}
        </Text>
        <Os7Logo h={18} href={os7Brand.siteHref} target="_blank" />
      </Group>
    </Stack>
  );
}

function AgentQrCode({
  label,
  size = 72,
  value
}: {
  label: string;
  size?: number;
  value: string;
}) {
  return (
    <Box
      aria-label={label}
      style={{
        background: 'white',
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: 8,
        lineHeight: 0,
        padding: 6
      }}
    >
      <QRCodeSVG value={value} size={size} marginSize={0} />
    </Box>
  );
}

function RequestModal({
  form,
  onChange,
  onClose,
  onSave,
  opened,
  saving
}: {
  form: RequestForm;
  onChange: (form: RequestForm) => void;
  onClose: () => void;
  onSave: () => void;
  opened: boolean;
  saving: boolean;
}) {
  const app = useTranslations('App');
  const fields = useTranslations('Fields');
  const requestsText = useTranslations('Requests');
  const statusOptions = [
    { value: 'NEW', label: requestsText('statusNew') },
    { value: 'CONFIRMED', label: requestsText('statusConfirmed') },
    { value: 'CANCELLED', label: requestsText('statusCancelled') }
  ];

  return (
    <Modal
      centered
      opened={opened}
      onClose={onClose}
      title={
        <ModalTitle icon={<Inbox size={16} />}>
          {requestsText('edit')}
        </ModalTitle>
      }
    >
      <Stack>
        <TextInput
          label={fields('visitorName')}
          value={form.visitorName}
          onChange={(event) =>
            onChange({ ...form, visitorName: event.currentTarget.value })
          }
        />
        <TextInput
          label={fields('visitorEmail')}
          value={form.visitorEmail}
          onChange={(event) =>
            onChange({ ...form, visitorEmail: event.currentTarget.value })
          }
        />
        <TextInput
          label={fields('visitorPhone')}
          value={form.visitorPhone}
          onChange={(event) =>
            onChange({ ...form, visitorPhone: event.currentTarget.value })
          }
        />
        <Textarea
          label={fields('requestDescription')}
          minRows={4}
          value={form.requestDescription}
          onChange={(event) =>
            onChange({
              ...form,
              requestDescription: event.currentTarget.value
            })
          }
        />
        <Select
          allowDeselect={false}
          data={statusOptions}
          label={requestsText('status')}
          value={form.status}
          onChange={(value) => {
            if (
              value === 'NEW' ||
              value === 'CONFIRMED' ||
              value === 'CANCELLED'
            ) {
              onChange({ ...form, status: value });
            }
          }}
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {app('cancel')}
          </Button>
          <Button loading={saving} onClick={onSave}>
            {app('save')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function ExceptionModal({
  form,
  onChange,
  onClose,
  onSave,
  opened,
  saving,
  title
}: {
  form: { date: string; note: string };
  onChange: (form: { date: string; note: string }) => void;
  onClose: () => void;
  onSave: () => void;
  opened: boolean;
  saving: boolean;
  title: string;
}) {
  const app = useTranslations('App');
  const fields = useTranslations('Fields');

  return (
    <Modal
      centered
      opened={opened}
      onClose={onClose}
      title={<ModalTitle icon={<CalendarX size={16} />}>{title}</ModalTitle>}
    >
      <Stack>
        <DateInput
          label={fields('date')}
          value={form.date || null}
          onChange={(value) => onChange({ ...form, date: value ?? '' })}
        />
        <TextInput
          label={fields('note')}
          value={form.note}
          onChange={(event) =>
            onChange({ ...form, note: event.currentTarget.value })
          }
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {app('cancel')}
          </Button>
          <Button
            disabled={!form.date}
            loading={saving}
            leftSection={<Plus size={16} />}
            onClick={onSave}
          >
            {app('add')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function AvailabilitySlotModal({
  deleting,
  form,
  locale,
  onChange,
  onClose,
  onDelete,
  onSave,
  opened,
  saving,
  title
}: {
  deleting: boolean;
  form: SlotForm;
  locale: string;
  onChange: (form: SlotForm) => void;
  onClose: () => void;
  onDelete?: () => Promise<void>;
  onSave: () => Promise<void>;
  opened: boolean;
  saving: boolean;
  title: string;
}) {
  const t = useTranslations('App');
  const fields = useTranslations('Fields');
  const weekday =
    formatWeekdayName(Number(form.weekday), locale) ??
    formatWeekdayName(1, locale);
  const modalTitle = `${title} · ${weekday}`;
  const endTimeOptions = TIME_OPTIONS.filter(
    (time) => minutesFromTime(time) > minutesFromTime(form.startTime)
  );

  function updateStartTime(startTime: string) {
    const currentEndTime = minutesFromTime(form.endTime);
    const nextStartTime = minutesFromTime(startTime);
    const nextEndTime =
      currentEndTime > nextStartTime
        ? form.endTime
        : (TIME_OPTIONS.find((time) => minutesFromTime(time) > nextStartTime) ??
          form.endTime);

    onChange({ ...form, startTime, endTime: nextEndTime });
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <ModalTitle icon={<CalendarClock size={16} />}>{modalTitle}</ModalTitle>
      }
      centered
    >
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TimeMenu
            label={fields('startTime')}
            options={START_TIME_OPTIONS}
            value={form.startTime}
            onChange={updateStartTime}
          />
          <TimeMenu
            label={fields('endTime')}
            options={endTimeOptions}
            value={form.endTime}
            onChange={(endTime) => onChange({ ...form, endTime })}
          />
        </SimpleGrid>
        <NumberInput
          label={fields('price')}
          min={0}
          value={form.price}
          onChange={(value) =>
            onChange({
              ...form,
              price: typeof value === 'number' ? String(value) : ''
            })
          }
        />
        <Group justify="space-between">
          {onDelete ? (
            <Button
              color="red"
              leftSection={<Trash2 size={16} />}
              loading={deleting}
              variant="subtle"
              disabled={saving}
              onClick={onDelete}
            >
              {t('delete')}
            </Button>
          ) : (
            <Box />
          )}
          <Group>
            <Button
              disabled={saving || deleting}
              variant="subtle"
              onClick={onClose}
            >
              {t('cancel')}
            </Button>
            <Button disabled={deleting} loading={saving} onClick={onSave}>
              {t('save')}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

function TimeMenu({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <Stack gap={4}>
      <Text fw={500} size="sm">
        {label}
      </Text>
      <Menu position="bottom-start" shadow="md" width="target" withinPortal>
        <Menu.Target>
          <Button
            fullWidth
            justify="space-between"
            rightSection={<ChevronDown size={16} />}
            variant="default"
          >
            {formatHourFromTime(value)}
          </Button>
        </Menu.Target>
        <Menu.Dropdown mah={260} maw={260} style={{ overflowY: 'auto' }}>
          {options.map((option) => (
            <Menu.Item
              key={option}
              bg={option === value ? 'var(--mantine-color-gray-1)' : undefined}
              onClick={() => onChange(option)}
            >
              {formatHourFromTime(option)}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Stack>
  );
}

function ContactLink({
  href,
  icon,
  label,
  value
}: {
  href: string | null;
  icon: ReactNode;
  label: string;
  value: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <Group gap="xs" wrap="nowrap">
      {icon}
      <Text c="dimmed" size="sm">
        {label}
      </Text>
      {href ? (
        <Anchor
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
        >
          {value}
        </Anchor>
      ) : (
        <Text>{value}</Text>
      )}
    </Group>
  );
}

function WeeklyBookingCalendar({
  exceptions,
  locale,
  onSelectSlot,
  slots,
  timeZone,
  weekStart
}: {
  exceptions: ExceptionDto[];
  locale: string;
  onSelectSlot: (slot: AvailableBookingSlotDto) => void;
  slots: AvailableBookingSlotDto[];
  timeZone: string;
  weekStart: string;
}) {
  const booking = useTranslations('Booking');
  const days = getWeekDays(weekStart, locale);
  const exceptionsByDate = new Map(
    exceptions.map((exception) => [exception.date, exception])
  );
  const slotsByDate = groupBookingSlotsByDate(slots, timeZone);
  const timeline = getBookingTimeline(slots, timeZone);

  return (
    <WeeklyCalendarGrid>
      {days.map((day) => {
        const daySlots = slotsByDate.get(day.dateKey) ?? [];
        const exception = exceptionsByDate.get(day.dateKey);

        return (
          <Paper
            key={day.dateKey}
            withBorder
            p="xs"
            radius="md"
            style={{ ...TIMELINE_GRID_STYLE, minHeight: 132 }}
          >
            <Stack gap="xs">
              <Stack gap={0}>
                <Text fw={700} size="sm">
                  {day.weekday}
                </Text>
                <Text c="dimmed" size="xs">
                  {day.label}
                </Text>
              </Stack>
              <Box
                style={{
                  minHeight: timeline.height,
                  position: 'relative'
                }}
              >
                {exception ? (
                  <Paper
                    bg="var(--mantine-color-gray-1)"
                    p="xs"
                    radius="md"
                    style={{
                      alignItems: 'center',
                      display: 'flex',
                      inset: 0,
                      justifyContent: 'center',
                      position: 'absolute',
                      textAlign: 'center'
                    }}
                  >
                    <Text c="dimmed" fw={600} size="xs">
                      {exception.note || booking('unavailable')}
                    </Text>
                  </Paper>
                ) : null}
                {daySlots.map((slot) => {
                  const start = minutesFromDateTime(slot.startAt, timeZone);
                  const end = minutesFromDateTime(slot.endAt, timeZone);
                  const { height, top } = getTimelineSlotLayout(
                    timeline,
                    start,
                    end
                  );

                  return (
                    <UnstyledButton
                      key={slot.startAt}
                      disabled={slot.booked}
                      style={{
                        cursor: slot.booked ? 'not-allowed' : 'pointer',
                        height,
                        left: 0,
                        opacity: slot.booked ? 0.7 : 1,
                        position: 'absolute',
                        right: 0,
                        top
                      }}
                      onClick={() => onSelectSlot(slot)}
                    >
                      <Paper
                        bg={
                          slot.booked
                            ? 'var(--mantine-color-gray-1)'
                            : 'var(--mantine-primary-color-light)'
                        }
                        p="xs"
                        radius="md"
                        style={{
                          alignItems: 'center',
                          display: 'flex',
                          height: '100%',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          width: '100%'
                        }}
                      >
                        <Stack align="center" gap={2}>
                          <Text fw={600} size="xs" ta="center">
                            {formatSlotCompact(
                              slot.startAt,
                              slot.endAt,
                              undefined,
                              undefined,
                              timeZone
                            )}
                          </Text>
                          {slot.booked ? (
                            <Text c="dimmed" size="xs" ta="center">
                              {booking('booked')}
                            </Text>
                          ) : null}
                        </Stack>
                      </Paper>
                    </UnstyledButton>
                  );
                })}
              </Box>
            </Stack>
          </Paper>
        );
      })}
    </WeeklyCalendarGrid>
  );
}

function WeeklyAdminCalendar({
  addLabel,
  currency,
  locale,
  onAddSlot,
  onEditSlot,
  slots,
  weekStart
}: {
  addLabel: string;
  currency: string;
  locale: string;
  onAddSlot: (weekday: number) => void;
  onEditSlot: (slot: AvailabilitySlotDto) => void;
  slots: AvailabilitySlotDto[];
  weekStart: string;
}) {
  const days = getWeekDays(weekStart, locale);
  const slotsByWeekday = groupByWeekday(slots);
  const timeline = getAdminTimeline(slots);

  return (
    <WeeklyCalendarGrid>
      {days.map((day) => {
        const daySlots = slotsByWeekday.get(day.weekdayIndex) ?? [];

        return (
          <Paper
            key={day.dateKey}
            withBorder
            p="xs"
            radius="md"
            style={{ ...TIMELINE_GRID_STYLE, minHeight: 132 }}
          >
            <Stack gap="xs">
              <Text fw={700} size="sm" ta="center">
                {day.weekday}
              </Text>
              <Button
                aria-label={addLabel}
                size="xs"
                variant="light"
                onClick={() => onAddSlot(day.weekdayIndex)}
              >
                <Plus size={14} />
              </Button>
              <Box
                style={{
                  minHeight: timeline.height,
                  position: 'relative'
                }}
              >
                {daySlots.map((slot) => {
                  const start = minutesFromTime(slot.startTime);
                  const end = minutesFromTime(slot.endTime);
                  const { height, top } = getTimelineSlotLayout(
                    timeline,
                    start,
                    end
                  );

                  return (
                    <UnstyledButton
                      key={slot.id}
                      style={{
                        height,
                        left: 0,
                        position: 'absolute',
                        right: 0,
                        top
                      }}
                      onClick={() => onEditSlot(slot)}
                    >
                      <Paper
                        bg="var(--mantine-primary-color-light)"
                        p="xs"
                        radius="md"
                        style={{
                          alignItems: 'center',
                          display: 'flex',
                          height: '100%',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          width: '100%'
                        }}
                      >
                        <Stack align="center" gap={2}>
                          <Text fw={600} size="xs" ta="center">
                            {formatTimeRangeCompact(
                              slot.startTime,
                              slot.endTime
                            )}
                          </Text>
                          {slot.price == null ? null : (
                            <Text c="dimmed" size="xs" ta="center">
                              {formatPrice(slot.price, currency)}
                            </Text>
                          )}
                        </Stack>
                      </Paper>
                    </UnstyledButton>
                  );
                })}
              </Box>
            </Stack>
          </Paper>
        );
      })}
    </WeeklyCalendarGrid>
  );
}

function WeeklyCalendarGrid({ children }: { children: ReactNode }) {
  return (
    <Box style={{ overflowX: 'auto', paddingBottom: 2 }}>
      <Box
        style={{
          display: 'grid',
          gap: 'var(--mantine-spacing-xs)',
          gridTemplateColumns: `repeat(7, minmax(${WEEKLY_CALENDAR_MIN_COLUMN_WIDTH}px, 1fr))`,
          minWidth: `calc(${WEEKLY_CALENDAR_MIN_COLUMN_WIDTH}px * 7 + var(--mantine-spacing-xs) * 6)`
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function EditableContentSection({
  editMode,
  inputValue,
  onBlur,
  onChange,
  placeholder,
  title,
  value
}: {
  editMode: boolean;
  inputValue: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  title: string;
  value: string | null;
}) {
  if (editMode) {
    return (
      <Box>
        <Textarea
          autosize
          minRows={3}
          label={title}
          placeholder={placeholder}
          value={inputValue}
          onBlur={onBlur}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </Box>
    );
  }

  if (!value) {
    return null;
  }

  return (
    <Box>
      <Group justify="space-between" align="center" mb={6}>
        <Title order={3} size="h4">
          {title}
        </Title>
      </Group>
      <MarkdownText value={value} />
    </Box>
  );
}

function MarkdownText({
  compact = false,
  value
}: {
  compact?: boolean;
  value: string;
}) {
  return (
    <ReactMarkdown
      allowedElements={[
        'a',
        'blockquote',
        'br',
        'code',
        'em',
        'li',
        'ol',
        'p',
        'strong',
        'ul'
      ]}
      components={{
        a: ({ children, href }) => {
          const safeHref = normalizeMarkdownHref(href ?? '');

          if (!safeHref) {
            return <>{children}</>;
          }

          return (
            <Anchor href={safeHref} rel="noreferrer" target="_blank">
              {children}
            </Anchor>
          );
        },
        blockquote: ({ children }) => (
          <Box
            component="blockquote"
            m={0}
            pl="md"
            style={{
              borderLeft: '3px solid var(--mantine-color-gray-4)',
              color: 'var(--mantine-color-dimmed)'
            }}
          >
            {children}
          </Box>
        ),
        code: ({ children }) => (
          <Text component="code" inherit>
            {children}
          </Text>
        ),
        li: ({ children }) => (
          <Box component="li" mb={compact ? 0 : 4}>
            <Text component="span">{children}</Text>
          </Box>
        ),
        ol: ({ children }) => (
          <Box
            component="ol"
            m={0}
            pl="lg"
            style={{ color: 'var(--mantine-color-text)' }}
          >
            {children}
          </Box>
        ),
        p: ({ children }) => (
          <Text mb={compact ? 0 : 'xs'} style={{ whiteSpace: 'pre-wrap' }}>
            {children}
          </Text>
        ),
        ul: ({ children }) => (
          <Box
            component="ul"
            m={0}
            pl="lg"
            style={{ color: 'var(--mantine-color-text)' }}
          >
            {children}
          </Box>
        )
      }}
    >
      {value}
    </ReactMarkdown>
  );
}

function normalizeMarkdownHref(value: string) {
  const trimmed = value.trim();

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function groupByWeekday<T extends { weekday: number }>(items: T[]) {
  const groups = new Map<number, T[]>();

  for (const item of items) {
    const group = groups.get(item.weekday) ?? [];
    group.push(item);
    groups.set(item.weekday, group);
  }

  return groups;
}

function groupBookingSlotsByDate(
  items: AvailableBookingSlotDto[],
  timeZone: string
) {
  const groups = new Map<string, AvailableBookingSlotDto[]>();

  for (const item of items) {
    const date = formatDateKeyInTimeZone(item.startAt, timeZone);
    const group = groups.get(date) ?? [];
    group.push(item);
    groups.set(date, group);
  }

  return groups;
}

function getWeekDays(weekStart: string, locale: string) {
  const start = parseDateOnly(weekStart);

  return weekdays.map((_, offset) => {
    const date = addDays(start, offset);

    return {
      dateKey: formatDateOnly(date),
      label: formatShortDate(date, locale),
      weekday: formatWeekdayName(date.getUTCDay(), locale),
      weekdayIndex: date.getUTCDay()
    };
  });
}

function BookingModal({
  currency,
  onBooked,
  onClose,
  slot,
  timeZone
}: {
  currency: string;
  onBooked: () => Promise<void>;
  onClose: () => void;
  slot: AvailableBookingSlotDto | null;
  timeZone: string;
}) {
  const app = useTranslations('App');
  const fields = useTranslations('Fields');
  const booking = useTranslations('Booking');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    visitorName: '',
    visitorEmail: '',
    visitorPhone: '',
    requestDescription: ''
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof form, string>>
  >({});

  async function submit() {
    if (!slot) {
      return;
    }

    const payload = {
      visitorName: form.visitorName.trim(),
      visitorEmail: form.visitorEmail.trim(),
      visitorPhone: form.visitorPhone.trim(),
      requestDescription: form.requestDescription.trim(),
      requestedStartAt: slot.startAt,
      requestedEndAt: slot.endAt
    };
    const nextErrors: Partial<Record<keyof typeof form, string>> = {};

    if (!payload.visitorName) {
      nextErrors.visitorName = booking('required');
    }

    if (!payload.visitorEmail) {
      nextErrors.visitorEmail = booking('required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.visitorEmail)) {
      nextErrors.visitorEmail = booking('invalidEmail');
    }

    if (payload.visitorPhone.length < 3) {
      nextErrors.visitorPhone = booking('required');
    }

    if (!payload.requestDescription) {
      nextErrors.requestDescription = booking('required');
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await api('/api/booking', {
        method: 'POST',
        body: payload
      });
      notifications.show({ color: 'green', message: booking('submitted') });
      setForm({
        visitorName: '',
        visitorEmail: '',
        visitorPhone: '',
        requestDescription: ''
      });
      onClose();
      await onBooked();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      opened={Boolean(slot)}
      onClose={onClose}
      title={
        <ModalTitle icon={<CalendarClock size={16} />}>
          {booking('title')}
        </ModalTitle>
      }
      centered
    >
      <Stack>
        {slot ? (
          <Alert title={booking('selected')} color="gray">
            {formatSlot(slot, currency, timeZone)}
          </Alert>
        ) : null}
        <TextInput
          label={fields('visitorName')}
          error={errors.visitorName}
          required
          value={form.visitorName}
          onChange={(event) =>
            setForm({ ...form, visitorName: event.currentTarget.value })
          }
        />
        <TextInput
          label={fields('visitorEmail')}
          error={errors.visitorEmail}
          required
          value={form.visitorEmail}
          onChange={(event) =>
            setForm({ ...form, visitorEmail: event.currentTarget.value })
          }
        />
        <TextInput
          label={fields('visitorPhone')}
          error={errors.visitorPhone}
          required
          value={form.visitorPhone}
          onChange={(event) =>
            setForm({ ...form, visitorPhone: event.currentTarget.value })
          }
        />
        <Textarea
          label={fields('requestDescription')}
          error={errors.requestDescription}
          required
          minRows={4}
          value={form.requestDescription}
          onChange={(event) =>
            setForm({ ...form, requestDescription: event.currentTarget.value })
          }
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {app('cancel')}
          </Button>
          <Button
            loading={submitting}
            leftSection={<Send size={16} />}
            onClick={submit}
          >
            {app('book')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

async function api(path: string, options: { method: string; body?: unknown }) {
  const response = await fetch(path, {
    method: options.method,
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();

  if (!payload.ok) {
    notifications.show({ color: 'red', message: payload.error.message });
    throw new Error(payload.error.message);
  }

  return payload.data;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatSlot(
  slot: AvailableBookingSlotDto,
  currency: string,
  timeZone: string
) {
  const compact = formatSlotCompact(
    slot.startAt,
    slot.endAt,
    slot.price,
    currency,
    timeZone
  );
  return `${slot.date} · ${compact}`;
}

function formatSlotCompact(
  startAt: string,
  endAt: string,
  price?: number | null,
  currency?: string,
  timeZone = 'UTC'
) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const minutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000)
  );

  return formatSlotText(formatHour(start, timeZone), minutes, price, currency);
}

function formatTimeRangeCompact(
  startTime: string,
  endTime: string,
  price?: number | null,
  currency?: string
) {
  const minutes = minutesFromTime(endTime) - minutesFromTime(startTime);
  return formatSlotText(
    formatHourFromTime(startTime),
    minutes,
    price,
    currency
  );
}

function formatSlotText(
  start: string,
  minutes: number,
  price?: number | null,
  currency = 'USD'
) {
  const base = `${start} / ${formatDuration(minutes)}`;
  return price == null ? base : `${base} · ${formatPrice(price, currency)}`;
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('en', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency'
  }).format(price);
}

function formatHour(date: Date, timeZone = 'UTC') {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    minute: '2-digit',
    timeZone
  }).formatToParts(date);
  const hours = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minutes = Number(
    parts.find((part) => part.type === 'minute')?.value ?? 0
  );
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour = hours % 12 || 12;
  return minutes === 0
    ? `${hour}${suffix}`
    : `${hour}:${String(minutes).padStart(2, '0')}${suffix}`;
}

function formatHourFromTime(time: string) {
  const [hours = '0', minutes = '0'] = time.split(':');
  return formatHour(new Date(2000, 0, 1, Number(hours), Number(minutes), 0, 0));
}

function formatDuration(minutes: number) {
  if (minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }

  if (minutes > 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  return `${minutes}m`;
}

function formatRequestStatus(
  status: ConsultationRequestDto['status'],
  t: (key: 'statusNew' | 'statusConfirmed' | 'statusCancelled') => string
) {
  if (status === 'CONFIRMED') {
    return t('statusConfirmed');
  }

  if (status === 'CANCELLED') {
    return t('statusCancelled');
  }

  return t('statusNew');
}

function minutesFromTime(time: string) {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function minutesFromDateTime(value: string, timeZone: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    minute: '2-digit',
    timeZone
  }).formatToParts(date);
  const hours = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minutes = Number(
    parts.find((part) => part.type === 'minute')?.value ?? 0
  );
  return hours * 60 + minutes;
}

function formatDateKeyInTimeZone(value: string, timeZone: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric'
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

function getTimelineSlotLayout(
  timeline: { height: number; span: number; start: number },
  start: number,
  end: number
) {
  const height = Math.min(
    timeline.height,
    Math.max(
      MIN_CALENDAR_SLOT_HEIGHT,
      ((end - start) / timeline.span) * timeline.height
    )
  );
  const rawTop = ((start - timeline.start) / timeline.span) * timeline.height;
  const top = Math.max(0, Math.min(rawTop, timeline.height - height));

  return { height, top };
}

function getBookingTimeline(
  slots: AvailableBookingSlotDto[],
  timeZone: string
) {
  if (slots.length === 0) {
    return { end: 18 * 60, height: 260, span: 9 * 60, start: 9 * 60 };
  }

  const minStart = Math.min(
    ...slots.map((slot) => minutesFromDateTime(slot.startAt, timeZone))
  );
  const maxEnd = Math.max(
    ...slots.map((slot) => minutesFromDateTime(slot.endAt, timeZone))
  );
  const start = Math.max(0, Math.floor(minStart / 60) * 60);
  const end = Math.min(24 * 60, Math.ceil(maxEnd / 60) * 60);
  const span = Math.max(60, end - start);
  const height = Math.min(460, Math.max(180, span * 0.8));

  return { end, height, span, start };
}

function getAdminTimeline(slots: AvailabilitySlotDto[]) {
  if (slots.length === 0) {
    return { end: 18 * 60, height: 260, span: 9 * 60, start: 9 * 60 };
  }

  const minStart = Math.min(
    ...slots.map((slot) => minutesFromTime(slot.startTime))
  );
  const maxEnd = Math.max(
    ...slots.map((slot) => minutesFromTime(slot.endTime))
  );
  const start = Math.max(0, Math.floor(minStart / 60) * 60);
  const end = Math.min(24 * 60, Math.ceil(maxEnd / 60) * 60);
  const span = Math.max(60, end - start);
  const height = Math.min(460, Math.max(180, span * 0.8));

  return { end, height, span, start };
}

function buildTimeOptions() {
  const options: string[] = [];

  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    options.push(
      `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    );
  }

  return options;
}

function buildTimeZoneOptions() {
  const timeZones =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : [
          'UTC',
          'Europe/Berlin',
          'Europe/London',
          'America/New_York',
          'America/Los_Angeles',
          'Asia/Dubai',
          'Asia/Tbilisi',
          'Asia/Yerevan',
          'Asia/Jerusalem',
          'Asia/Singapore',
          'Asia/Tokyo'
        ];

  return Array.from(new Set(['UTC', ...timeZones]))
    .map((timeZone) => ({
      value: timeZone,
      label: `${formatTimeZoneName(timeZone)} (${formatTimeZoneOffset(timeZone)})`
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function formatTimeZoneName(timeZone: string) {
  if (timeZone === 'UTC') {
    return 'UTC';
  }

  const parts = timeZone.split('/');
  return humanizeTimeZonePart(parts.at(-1) ?? timeZone);
}

function humanizeTimeZonePart(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function formatTimeZoneOffset(timeZone: string) {
  const offset = getTimeZoneOffsetMinutes(new Date(), timeZone);
  const sign = offset >= 0 ? '+' : '-';
  const absolute = Math.abs(offset);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;

  return `GMT${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric'
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );

  return Math.round(
    (Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second
    ) -
      date.getTime()) /
      60000
  );
}

function phoneHref(value: string | null) {
  return value ? `tel:${value.replace(/\s+/g, '')}` : null;
}

function emailHref(value: string | null) {
  return value ? `mailto:${value}` : null;
}

function whatsAppHref(value: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith('http')) {
    return value;
  }

  const phone = value.replace(/[^\d]/g, '');
  return phone ? `https://wa.me/${phone}` : null;
}

function telegramHref(value: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith('http')) {
    return value;
  }

  return `https://t.me/${value.replace(/^@/, '')}`;
}

function websiteHref(value: string | null) {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function sectionFromPath(pathname: string): CardSection {
  if (pathname === '/contacts' || pathname === '/admin/contacts') {
    return 'contacts';
  }

  if (pathname === '/book' || pathname === '/admin/book') {
    return 'book';
  }

  if (pathname === '/admin/exceptions') {
    return 'exceptions';
  }

  if (pathname === '/admin/requests') {
    return 'requests';
  }

  if (pathname === '/admin/settings') {
    return 'settings';
  }

  return 'profile';
}

function sectionHref(section: CardSection, editMode: boolean) {
  if (editMode) {
    if (section === 'contacts') {
      return '/admin/contacts';
    }

    if (section === 'book') {
      return '/admin/book';
    }

    if (section === 'exceptions') {
      return '/admin/exceptions';
    }

    if (section === 'requests') {
      return '/admin/requests';
    }

    if (section === 'settings') {
      return '/admin/settings';
    }

    return '/admin';
  }

  if (section === 'contacts') {
    return '/contacts';
  }

  if (section === 'book') {
    return '/book';
  }

  if (
    section === 'exceptions' ||
    section === 'requests' ||
    section === 'settings'
  ) {
    return '/book';
  }

  return '/';
}

function publicSectionFor(section: CardSection): CardSection {
  if (
    section === 'exceptions' ||
    section === 'requests' ||
    section === 'settings'
  ) {
    return 'book';
  }

  return section;
}

function parseDateOnly(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date, firstDayOfWeek = 1) {
  const day = date.getUTCDay();
  const diff = (day - firstDayOfWeek + 7) % 7;
  return addDays(startOfDay(date), -diff);
}

function startOfDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatShortDate(date: Date, locale: string) {
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  });
}

function buildFirstDayOptions(locale: string) {
  return weekdays.map((_, index) => ({
    value: String(index),
    label: formatWeekdayName(index, locale)
  }));
}

function formatWeekdayName(weekday: number, locale: string) {
  const sunday = new Date(Date.UTC(2026, 5, 21 + weekday));
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'long'
  }).format(sunday);
}

function formatRange(startAt: string, endAt: string, timeZone: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${start.toLocaleString(undefined, {
    timeZone
  })} - ${end.toLocaleTimeString(undefined, { timeZone })}`;
}

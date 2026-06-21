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
  Divider,
  FileButton,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ModalTitle } from '@os7/ui-kit/modal-title';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe,
  IdCard,
  MapPin,
  Mail,
  MessageCircle,
  Phone,
  Pencil,
  Plus,
  Send,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { MouseEvent, ReactNode } from 'react';
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
  ConsultationRequestDto
} from './types';

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

export type CardSection = 'profile' | 'contacts' | 'book';

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

export function CardApp({
  initialSection = 'profile',
  initialSnapshot,
  initialWeekStart
}: {
  initialSection?: CardSection;
  initialSnapshot?: CardSnapshotDto;
  initialWeekStart?: string;
}) {
  const [weekStart, setWeekStart] = useState(
    () => initialWeekStart ?? formatDateOnly(startOfWeek(new Date()))
  );
  const [calendarWeekStart, setCalendarWeekStart] = useState(weekStart);
  const [snapshot, setSnapshot] = useState<CardSnapshotDto | null>(
    initialSnapshot ?? null
  );
  const [loading, setLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);

  async function refresh(nextWeekStart = calendarWeekStart) {
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
  }

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
        section={initialSection}
        weekStart={calendarWeekStart}
        snapshot={snapshot}
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
  section,
  snapshot,
  weekStart
}: {
  section: CardSection;
  snapshot: CardSnapshotDto;
  weekStart: string;
  onBooked: () => Promise<void>;
  onChanged: () => Promise<void>;
  onWeekChange: (weekStart: string) => Promise<void>;
}) {
  const t = useTranslations('App');
  const fields = useTranslations('Fields');
  const sections = useTranslations('Sections');
  const [currentSection, setCurrentSection] = useState<CardSection>(section);
  const [selectedSlot, setSelectedSlot] =
    useState<AvailableBookingSlotDto | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form, setForm] = useState<ProfileForm>(() => ({
    photoUrl: snapshot.profile.photoUrl ?? '',
    name: snapshot.profile.name ?? '',
    title: snapshot.profile.title ?? '',
    location: snapshot.profile.location ?? '',
    age: snapshot.profile.age ?? '',
    contactPhone: snapshot.profile.contactPhone ?? '',
    contactEmail: snapshot.profile.contactEmail ?? '',
    contactWhatsApp: snapshot.profile.contactWhatsApp ?? '',
    contactTelegram: snapshot.profile.contactTelegram ?? '',
    contactWebsite: snapshot.profile.contactWebsite ?? '',
    professionalProfile: snapshot.profile.professionalProfile ?? '',
    expertise: snapshot.profile.expertise ?? '',
    casesAndResults: snapshot.profile.casesAndResults ?? '',
    experienceAndAchievements: snapshot.profile.experienceAndAchievements ?? '',
    collaborationFormats: snapshot.profile.collaborationFormats ?? ''
  }));
  const [hasUnsavedProfileChanges, setHasUnsavedProfileChanges] =
    useState(false);
  const [slotForm, setSlotForm] = useState<SlotForm>({
    weekday: '1',
    startTime: '10:00',
    endTime: '11:00',
    price: ''
  });
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotModalOpened, setSlotModalOpened] = useState(false);
  const [slotSaving, setSlotSaving] = useState(false);
  const [excludedDate, setExcludedDate] = useState({ date: '', note: '' });
  const editMode = snapshot.isAdmin && mode === 'edit';
  const previousWeekStart = formatDateOnly(
    addDays(parseDateOnly(weekStart), -7)
  );
  const nextWeekStart = formatDateOnly(addDays(parseDateOnly(weekStart), 7));
  const displayProfile = snapshot.isAdmin
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
        professionalProfile: form.professionalProfile || null,
        expertise: form.expertise || null,
        casesAndResults: form.casesAndResults || null,
        experienceAndAchievements: form.experienceAndAchievements || null,
        collaborationFormats: form.collaborationFormats || null
      }
    : snapshot.profile;

  useEffect(() => {
    function handlePopState() {
      setCurrentSection(sectionFromPath(window.location.pathname));
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    window.history.pushState(null, '', href);
    setCurrentSection(nextSection);
  }

  const saveProfile = useCallback(
    async ({
      complete = false,
      refresh = true,
      resetMode = true
    }: {
      complete?: boolean;
      refresh?: boolean;
      resetMode?: boolean;
    } = {}) => {
      setSaving(true);
      try {
        await Promise.all([
          api('/api/admin/profile', {
            method: 'PATCH',
            body: {
              ...form,
              photoUrl: form.photoUrl || null,
              age: form.age === '' ? null : form.age,
              onboardingStep: complete ? 'COMPLETE' : undefined
            }
          }),
          delay(UI_DELAY)
        ]);
        setHasUnsavedProfileChanges(false);
        if (resetMode) {
          setMode('view');
        }

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
      void saveProfile({ resetMode: false, refresh: false });
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

    void saveProfile({ resetMode: false, refresh: false });
  }

  function changeMode(value: string) {
    const nextMode = value as 'view' | 'edit';
    if (
      mode === 'edit' &&
      nextMode === 'view' &&
      hasUnsavedProfileChanges &&
      form.name.trim()
    ) {
      void saveProfile({ resetMode: false, refresh: false });
    }

    setMode(nextMode);
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
      await api(
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
      );
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

    setSlotSaving(true);
    try {
      await deleteSlot(editingSlotId);
      setSlotModalOpened(false);
      setEditingSlotId(null);
    } catch {
      // api() already shows the error notification.
    } finally {
      setSlotSaving(false);
    }
  }

  async function deleteSlot(id: string) {
    await api(`/api/admin/availability/${id}`, { method: 'DELETE' });
    await onChanged();
  }

  async function addExcludedDate() {
    await api('/api/admin/excluded-dates', {
      method: 'POST',
      body: {
        date: excludedDate.date,
        note: excludedDate.note || null
      }
    });
    setExcludedDate({ date: '', note: '' });
    await onChanged();
  }

  async function deleteExcludedDate(id: string) {
    await api(`/api/admin/excluded-dates/${id}`, { method: 'DELETE' });
    await onChanged();
  }

  async function updateRequest(
    request: ConsultationRequestDto,
    status: 'REVIEWED' | 'HANDLED'
  ) {
    await api(`/api/admin/requests/${request.id}`, {
      method: 'PATCH',
      body: { status }
    });
    await onChanged();
  }

  return (
    <Stack gap="sm">
      {snapshot.isAdmin ? (
        <Box style={{ position: 'relative' }}>
          <Group justify="center">
            <SegmentedControl
              value={mode}
              onChange={changeMode}
              data={[
                {
                  value: 'view',
                  label: (
                    <Group gap={4} justify="center" wrap="nowrap">
                      <Eye size={14} />
                      <span>{t('view')}</span>
                    </Group>
                  )
                },
                {
                  value: 'edit',
                  label: (
                    <Group gap={4} justify="center" wrap="nowrap">
                      <Pencil size={14} />
                      <span>{t('edit')}</span>
                    </Group>
                  )
                }
              ]}
            />
          </Group>
          <Box
            aria-label={t('saving')}
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          >
            {saving ? <Loader size="sm" type="dots" /> : null}
          </Box>
        </Box>
      ) : null}

      <Paper withBorder p={{ base: 'md', sm: 'xl' }} radius="md">
        <Stack gap="lg">
          <Group align="flex-start" gap="md" wrap="nowrap">
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
                    <Text>{displayProfile.title}</Text>
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
          </Group>

          <Tabs value={currentSection}>
            <Tabs.List>
              <Tabs.Tab
                value="profile"
                leftSection={<IdCard size={16} />}
                renderRoot={(props) => (
                  <Link
                    href="/"
                    {...props}
                    onClick={(event) => navigateSection(event, 'profile', '/')}
                  />
                )}
              >
                {t('profile')}
              </Tabs.Tab>
              <Tabs.Tab
                value="contacts"
                leftSection={<Mail size={16} />}
                renderRoot={(props) => (
                  <Link
                    href="/contacts"
                    {...props}
                    onClick={(event) =>
                      navigateSection(event, 'contacts', '/contacts')
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
                    href="/book"
                    {...props}
                    onClick={(event) => navigateSection(event, 'book', '/book')}
                  />
                )}
              >
                {t('book')}
              </Tabs.Tab>
            </Tabs.List>

            {currentSection === 'profile' ? (
              <Box pt="lg">
                <Stack gap="lg">
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
                      <Group justify="flex-end" align="center">
                        <Group gap="xs">
                          <Button
                            size="xs"
                            variant="subtle"
                            leftSection={<ChevronLeft size={14} />}
                            onClick={() => onWeekChange(previousWeekStart)}
                          >
                            {t('previousWeek')}
                          </Button>
                          <Button
                            size="xs"
                            variant="subtle"
                            rightSection={<ChevronRight size={14} />}
                            onClick={() => onWeekChange(nextWeekStart)}
                          >
                            {t('nextWeek')}
                          </Button>
                        </Group>
                      </Group>
                      <WeeklyBookingCalendar
                        weekStart={weekStart}
                        slots={snapshot.availableBookingSlots}
                        onSelectSlot={setSelectedSlot}
                      />
                    </Stack>
                  ) : null}

                  {snapshot.profile.showAvailability && editMode ? (
                    <Stack>
                      <WeeklyAdminCalendar
                        addLabel={t('addSlot')}
                        weekStart={weekStart}
                        slots={snapshot.availabilitySlots}
                        onAddSlot={openAddSlotModal}
                        onEditSlot={openEditSlotModal}
                      />
                      <Divider label={sections('excludedDates')} />
                      <SimpleGrid cols={{ base: 1, sm: 3 }}>
                        <TextInput
                          label={fields('date')}
                          type="date"
                          value={excludedDate.date}
                          onChange={(event) =>
                            setExcludedDate({
                              ...excludedDate,
                              date: event.currentTarget.value
                            })
                          }
                        />
                        <TextInput
                          label={fields('note')}
                          value={excludedDate.note}
                          onChange={(event) =>
                            setExcludedDate({
                              ...excludedDate,
                              note: event.currentTarget.value
                            })
                          }
                        />
                        <Button
                          mt={{ sm: 25 }}
                          leftSection={<Plus size={16} />}
                          onClick={addExcludedDate}
                        >
                          {t('add')}
                        </Button>
                      </SimpleGrid>
                      <Stack gap="xs">
                        {snapshot.excludedDates.map((date) => (
                          <Group
                            key={date.id}
                            justify="space-between"
                            wrap="nowrap"
                          >
                            <Text>
                              {date.date}
                              {date.note ? ` - ${date.note}` : ''}
                            </Text>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => deleteExcludedDate(date.id)}
                            >
                              <Trash2 size={16} />
                            </ActionIcon>
                          </Group>
                        ))}
                      </Stack>
                    </Stack>
                  ) : null}

                  {editMode ? (
                    <Stack>
                      <Group justify="space-between" align="center">
                        <Divider
                          label={sections('requests')}
                          style={{ flex: 1 }}
                        />
                      </Group>
                      {(snapshot.consultationRequests ?? []).length === 0 ? (
                        <Text c="dimmed">No requests yet.</Text>
                      ) : (
                        snapshot.consultationRequests?.map((request) => (
                          <Paper key={request.id} withBorder p="md" radius="md">
                            <Stack gap="xs">
                              <Group justify="space-between">
                                <Text fw={700}>{request.visitorName}</Text>
                                <Badge>{request.status}</Badge>
                              </Group>
                              <Text c="dimmed" size="sm">
                                {request.visitorEmail} · {request.visitorPhone}
                              </Text>
                              <Text size="sm">
                                {formatRange(
                                  request.requestedStartAt,
                                  request.requestedEndAt
                                )}
                              </Text>
                              <Text>{request.requestDescription}</Text>
                              <Group>
                                <Button
                                  size="xs"
                                  variant="light"
                                  onClick={() =>
                                    updateRequest(request, 'REVIEWED')
                                  }
                                >
                                  Reviewed
                                </Button>
                                <Button
                                  size="xs"
                                  variant="light"
                                  onClick={() =>
                                    updateRequest(request, 'HANDLED')
                                  }
                                >
                                  Handled
                                </Button>
                              </Group>
                            </Stack>
                          </Paper>
                        ))
                      )}
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            ) : null}
          </Tabs>
        </Stack>
      </Paper>

      <BookingModal
        slot={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        onBooked={async () => {
          setSelectedSlot(null);
          await onBooked();
        }}
      />
      <AvailabilitySlotModal
        form={slotForm}
        opened={slotModalOpened}
        saving={slotSaving}
        title={editingSlotId ? t('editSlot') : t('addSlot')}
        onChange={setSlotForm}
        onClose={() => setSlotModalOpened(false)}
        onDelete={editingSlotId ? deleteEditingSlot : undefined}
        onSave={saveSlot}
      />
    </Stack>
  );
}

function AvailabilitySlotModal({
  form,
  onChange,
  onClose,
  onDelete,
  onSave,
  opened,
  saving,
  title
}: {
  form: SlotForm;
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
  const weekday = weekdays[Number(form.weekday)] ?? weekdays[1];
  const modalTitle = `${title} · ${weekday}`;

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
          <TextInput
            label={fields('startTime')}
            value={form.startTime}
            onChange={(event) =>
              onChange({ ...form, startTime: event.currentTarget.value })
            }
          />
          <TextInput
            label={fields('endTime')}
            value={form.endTime}
            onChange={(event) =>
              onChange({ ...form, endTime: event.currentTarget.value })
            }
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
              loading={saving}
              variant="subtle"
              onClick={onDelete}
            >
              {t('delete')}
            </Button>
          ) : (
            <Box />
          )}
          <Group>
            <Button variant="subtle" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button loading={saving} onClick={onSave}>
              {t('save')}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
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
  onSelectSlot,
  slots,
  weekStart
}: {
  onSelectSlot: (slot: AvailableBookingSlotDto) => void;
  slots: AvailableBookingSlotDto[];
  weekStart: string;
}) {
  const days = getWeekDays(weekStart);
  const slotsByDate = groupByDate(slots);

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 7 }} spacing="xs">
      {days.map((day) => {
        const daySlots = slotsByDate.get(day.dateKey) ?? [];

        return (
          <Paper
            key={day.dateKey}
            withBorder
            p="xs"
            radius="md"
            style={{ minHeight: 132 }}
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
              {daySlots.length === 0 ? (
                <Box />
              ) : (
                daySlots.map((slot) => (
                  <Button
                    key={slot.startAt}
                    size="xs"
                    variant="light"
                    fullWidth
                    onClick={() => onSelectSlot(slot)}
                  >
                    {formatSlotCompact(slot.startAt, slot.endAt)}
                  </Button>
                ))
              )}
            </Stack>
          </Paper>
        );
      })}
    </SimpleGrid>
  );
}

function WeeklyAdminCalendar({
  addLabel,
  onAddSlot,
  onEditSlot,
  slots,
  weekStart
}: {
  addLabel: string;
  onAddSlot: (weekday: number) => void;
  onEditSlot: (slot: AvailabilitySlotDto) => void;
  slots: AvailabilitySlotDto[];
  weekStart: string;
}) {
  const days = getWeekDays(weekStart);
  const slotsByWeekday = groupByWeekday(slots);

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 7 }} spacing="xs">
      {days.map((day) => {
        const daySlots = slotsByWeekday.get(day.weekdayIndex) ?? [];

        return (
          <Paper
            key={day.dateKey}
            withBorder
            p="xs"
            radius="md"
            style={{ minHeight: 132 }}
          >
            <Stack gap="xs">
              <Stack gap={2} align="center">
                <ActionIcon
                  aria-label={addLabel}
                  size="sm"
                  variant="light"
                  onClick={() => onAddSlot(day.weekdayIndex)}
                >
                  <Plus size={14} />
                </ActionIcon>
                <Stack gap={0}>
                  <Text fw={700} size="sm">
                    {day.weekday}
                  </Text>
                </Stack>
              </Stack>
              {daySlots.length === 0 ? (
                <Box />
              ) : (
                daySlots.map((slot) => (
                  <Group
                    key={slot.id}
                    gap={4}
                    justify="space-between"
                    wrap="nowrap"
                  >
                    <Button
                      fullWidth
                      justify="flex-start"
                      size="xs"
                      variant="light"
                      onClick={() => onEditSlot(slot)}
                    >
                      {formatTimeRangeCompact(slot.startTime, slot.endTime)}
                    </Button>
                  </Group>
                ))
              )}
            </Stack>
          </Paper>
        );
      })}
    </SimpleGrid>
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
      <Text style={{ whiteSpace: 'pre-wrap' }}>{value}</Text>
    </Box>
  );
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

function groupByDate<T extends { date: string }>(items: T[]) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const group = groups.get(item.date) ?? [];
    group.push(item);
    groups.set(item.date, group);
  }

  return groups;
}

function getWeekDays(weekStart: string) {
  const start = parseDateOnly(weekStart);

  return weekdays.map((weekday, offset) => {
    const date = addDays(start, offset);

    return {
      dateKey: formatDateOnly(date),
      label: formatShortDate(date),
      weekday,
      weekdayIndex: date.getUTCDay()
    };
  });
}

function BookingModal({
  onBooked,
  onClose,
  slot
}: {
  onBooked: () => Promise<void>;
  onClose: () => void;
  slot: AvailableBookingSlotDto | null;
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

  async function submit() {
    if (!slot) {
      return;
    }

    setSubmitting(true);
    await api('/api/booking', {
      method: 'POST',
      body: {
        ...form,
        requestedStartAt: slot.startAt,
        requestedEndAt: slot.endAt
      }
    });
    setSubmitting(false);
    notifications.show({ color: 'green', message: booking('submitted') });
    setForm({
      visitorName: '',
      visitorEmail: '',
      visitorPhone: '',
      requestDescription: ''
    });
    await onBooked();
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
            {formatSlot(slot)}
          </Alert>
        ) : null}
        <TextInput
          label={fields('visitorName')}
          required
          value={form.visitorName}
          onChange={(event) =>
            setForm({ ...form, visitorName: event.currentTarget.value })
          }
        />
        <TextInput
          label={fields('visitorEmail')}
          required
          value={form.visitorEmail}
          onChange={(event) =>
            setForm({ ...form, visitorEmail: event.currentTarget.value })
          }
        />
        <TextInput
          label={fields('visitorPhone')}
          required
          value={form.visitorPhone}
          onChange={(event) =>
            setForm({ ...form, visitorPhone: event.currentTarget.value })
          }
        />
        <Textarea
          label={fields('requestDescription')}
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

function formatSlot(slot: AvailableBookingSlotDto) {
  const compact = formatSlotCompact(slot.startAt, slot.endAt, slot.price);
  return `${slot.date} · ${compact}`;
}

function formatSlotCompact(
  startAt: string,
  endAt: string,
  price?: number | null
) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const minutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000)
  );

  return formatSlotText(formatHour(start), minutes, price);
}

function formatTimeRangeCompact(
  startTime: string,
  endTime: string,
  price?: number | null
) {
  const minutes = minutesFromTime(endTime) - minutesFromTime(startTime);
  return formatSlotText(formatHourFromTime(startTime), minutes, price);
}

function formatSlotText(start: string, minutes: number, price?: number | null) {
  const base = `${start} / ${formatDuration(minutes)}`;
  return price == null ? base : `${base} · ${formatPrice(price)}`;
}

function formatPrice(price: number) {
  return `$${price}`;
}

function formatHour(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
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

function minutesFromTime(time: string) {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
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
  if (pathname === '/contacts') {
    return 'contacts';
  }

  if (pathname === '/book') {
    return 'book';
  }

  return 'profile';
}

function parseDateOnly(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  return addDays(startOfDay(date), -date.getUTCDay());
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

function formatShortDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  });
}

function formatRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${start.toLocaleString()} - ${end.toLocaleTimeString()}`;
}

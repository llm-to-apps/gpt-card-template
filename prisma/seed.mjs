import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';

loadEnvFile();

const prisma = new PrismaClient();

async function main() {
  const existingProfile = await prisma.cardProfile.findFirst({
    orderBy: { createdAt: 'asc' }
  });

  const profile = existingProfile
    ? await prisma.cardProfile.update({
        where: { id: existingProfile.id },
        data: demoProfileData()
      })
    : await prisma.cardProfile.create({
        data: demoProfileData()
      });

  await Promise.all(
    [
      { weekday: 1, startTime: '09:00', endTime: '10:00', price: 150 },
      { weekday: 1, startTime: '14:00', endTime: '15:00', price: 150 },
      { weekday: 2, startTime: '10:00', endTime: '11:00', price: 175 },
      { weekday: 3, startTime: '16:00', endTime: '17:00', price: 150 },
      { weekday: 4, startTime: '11:00', endTime: '12:00', price: 200 },
      { weekday: 5, startTime: '13:00', endTime: '14:00', price: 150 }
    ].map((slot) =>
      prisma.availabilitySlot.upsert({
        where: {
          profileId_weekday_startTime_endTime: {
            profileId: profile.id,
            weekday: slot.weekday,
            startTime: slot.startTime,
            endTime: slot.endTime
          }
        },
        update: { price: slot.price },
        create: {
          profileId: profile.id,
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
          price: slot.price
        }
      })
    )
  );

  if (
    (await prisma.excludedDate.count({ where: { profileId: profile.id } })) ===
    0
  ) {
    await prisma.excludedDate.createMany({
      data: [
        {
          profileId: profile.id,
          date: addDays(startOfDay(new Date()), 10),
          note: 'Conference day'
        },
        {
          profileId: profile.id,
          date: addDays(startOfDay(new Date()), 18),
          note: 'Public holiday'
        }
      ],
      skipDuplicates: true
    });
  }

  if (
    (await prisma.consultationRequest.count({
      where: { profileId: profile.id }
    })) === 0
  ) {
    const nextTuesday = nextWeekday(new Date(), 2);

    await prisma.consultationRequest.createMany({
      data: [
        {
          profileId: profile.id,
          requestedStartAt: dateWithTime(nextTuesday, '10:00'),
          requestedEndAt: dateWithTime(nextTuesday, '11:00'),
          visitorName: 'Maya Chen',
          visitorEmail: 'maya@example.com',
          visitorPhone: '+1 415 555 0184',
          requestDescription:
            'I want to review our positioning before launching a new expert services page.',
          status: 'NEW'
        },
        {
          profileId: profile.id,
          requestedStartAt: dateWithTime(nextWeekday(new Date(), 4), '11:00'),
          requestedEndAt: dateWithTime(nextWeekday(new Date(), 4), '12:00'),
          visitorName: 'Alex Morgan',
          visitorEmail: 'alex@example.com',
          visitorPhone: '+1 212 555 0109',
          requestDescription:
            'Looking for a 30-minute audit of our consulting offer and conversion flow.',
          status: 'REVIEWED'
        }
      ]
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  });

function loadEnvFile() {
  if (!existsSync('.env')) {
    return;
  }

  const lines = readFileSync('.env', 'utf8').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    process.env[key] ??= value;
  }
}

function demoProfileData() {
  return {
    onboardingStep: 'COMPLETE',
    onboardingCompletedAt: new Date(),
    showAvailability: true,
    photoUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=512&q=80',
    name: 'Sofia Reed',
    title: 'Product strategist for expert-led AI services',
    location: 'San Francisco, CA',
    age: 34,
    contactPhone: '+1 415 555 0142',
    contactEmail: 'sofia.reed@example.com',
    contactWhatsApp: '+1 415 555 0142',
    contactTelegram: '@sofia_reed',
    contactWebsite: 'https://sofia-reed.example.com',
    professionalProfile:
      'Independent product strategist helping expert-led teams turn knowledge, services, and internal workflows into clear digital products. 12 years across SaaS, consulting, and AI-enabled operations.',
    expertise:
      'I help founders, consultants, and boutique teams clarify their offer, design client-facing experiences, and build practical AI-assisted workflows that save time without making the product feel generic.',
    casesAndResults:
      'Redesigned a consulting onboarding flow that reduced first-call prep time by 45%. Helped a B2B services team package three internal processes into a paid client portal. Supported a founder through a launch that generated 38 qualified calls in the first month.',
    experienceAndAchievements:
      'Former product lead at two venture-backed SaaS companies. Speaker at product operations meetups. Published essays on AI-assisted service design and client experience systems.',
    collaborationFormats:
      'Strategy sessions, product audits, launch planning, workflow mapping, async advisory, and monthly mentoring for founders or senior operators.'
  };
}

function startOfDay(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function nextWeekday(date, weekday) {
  const start = startOfDay(date);
  const offset = (weekday - start.getUTCDay() + 7) % 7 || 7;
  return addDays(start, offset);
}

function dateWithTime(date, time) {
  const [hours = '0', minutes = '0'] = time.split(':');
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      Number(hours),
      Number(minutes)
    )
  );
}

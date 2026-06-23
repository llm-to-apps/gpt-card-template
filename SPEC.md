# GPT Card Template Specification

## Purpose

GPT Card lets a person create a personal business-card website for other people to visit. The app should help the user quickly turn their photo, professional story, expertise, results, and collaboration formats into a polished public profile.

The first version should focus on one clear workflow: collect profile content during onboarding, generate a clean card-style website preview, and let the user refine the content later.

All user data must be persisted in a MySQL database.

## Technology Stack

The app should use the same technology stack and project conventions as the Money template:

- Next.js App Router
- React
- TypeScript
- Prisma
- MySQL as the production database
- Mantine
- OS7 UI kit
- next-intl for localization
- Zod-style runtime validation
- typed app MCP tools
- structured server logging and safe error reporting

Follow the same OS7 template architecture: thin route handlers, feature services, shared API/result contracts, server-only infrastructure, and MCP tools that reuse the same business service layer as UI/API actions.

The development server must support OS7 external dev domains. Configure Next.js `allowedDevOrigins` to allow `127.0.0.1`, `*.localhost`, and `*.os7.dev` so `_next` dev resources, HMR, and generated CSS load correctly when the app is opened through an OS7 dev URL.

## Target User

The app is for professionals who need a simple public page:

- consultants
- experts
- founders
- creators
- freelancers
- mentors
- independent specialists

The user may not know how to write a strong profile, so the app should guide them with clear field labels and helpful structure.

## Authentication And Permissions

Editing the website is allowed only for an authenticated OS7 OAuth user with the `admin` role.

The generated website card must also be available to anonymous visitors. Anonymous users do not need to sign in to view the public page.

Requirements:

- use OS7 OAuth for authentication
- require an active authenticated session for onboarding, profile editing, photo updates, and availability editing
- require the authenticated user to have the `admin` role before allowing any write operation
- block non-admin users from editing and saving data
- allow anonymous public visitors to view the generated website card without edit controls
- never expose admin-only controls on the public card view

Read-only public access and admin editing must be clearly separated in the application flow.

## App MCP For Subagent Editing

The app must expose an MCP interface for a project subagent so the subagent can edit the website on behalf of the authenticated admin user.

The MCP interface should support:

- reading the current profile data
- updating any profile section
- updating the profile photo reference when an uploaded file is available
- reading weekly consultation availability
- adding consultation availability slots
- updating consultation availability slots
- removing consultation availability slots
- reading booking exceptions
- adding exceptions
- removing exceptions
- reading visitor consultation requests
- marking visitor consultation requests as reviewed or handled, when request management is implemented

MCP write operations must enforce the same authorization rules as the UI:

- require OS7 OAuth context
- require the acting user to have the `admin` role
- reject writes from anonymous or non-admin users
- persist all successful changes in MySQL

The MCP should return structured results that are safe for the agent to summarize to the user.

## Public MCP For Booking

The app must also expose a separate public MCP interface for booking consultation slots.

This public MCP is only for anonymous or public visitor booking flows. It must not expose profile editing, admin settings, onboarding state, or any admin-only data.

The public MCP should support:

- reading public profile summary data needed to present the booking context
- reading available consultation slots
- checking whether a selected slot is still available
- creating a visitor consultation request for a selected slot

The public MCP booking request should collect:

- selected date and time slot
- visitor name
- visitor email
- visitor phone
- short request description

Public MCP writes must be limited to creating consultation requests in MySQL. They must not allow updating profile content, weekly availability, exceptions, onboarding state, or request management status.

The public MCP should return structured success and validation responses that are safe to show to an anonymous visitor.

## First Run Onboarding

When the user installs and opens the app for the first time, they must be welcomed by an onboarding flow.

The onboarding should:

- explain that the app will create a personal website card
- allow the user to upload a profile photo
- ask the user to fill in core profile fields step by step
- ask the user to configure weekly consultation availability after profile details are complete
- save data after each step
- allow the user to leave onboarding and continue later without losing progress
- make optional fields clearly optional
- save progress safely
- end by showing the generated card website preview

The onboarding should not feel like a long form dumped on one screen. It should be calm, focused, and easy to complete.

After onboarding is complete, the user should immediately see the finished page generated from their own data. This page should be the primary app experience after setup.

## Profile Photo

The user can upload their own photo.

Photo requirements:

- support common image formats such as JPEG, PNG, and WebP
- show a preview after upload
- allow replacing the photo
- preserve the original upload when possible
- generate an optimized display version for the card

If the user skips photo upload, the app should use a neutral placeholder.

## Profile Fields

### Name

Required.

The user's public name as it should appear on the website card.

### Age

Optional.

The user's age. If empty, it should not appear on the public card.

### Professional Profile

Required.

Prompt:

> Who you are, what you do, your experience, and your specialization.

This section should become the main introduction on the card.

### Expertise

Required.

Prompt:

> What problems you solve and for whom.

This section should describe the user's target audience and strongest areas of expertise.

### Cases And Results

Required.

Prompt:

> Specific results from clients and projects.

This section should emphasize outcomes, examples, and proof.

### Experience And Achievements

Optional.

Prompt:

> Numbers, companies, publications, awards, talks, and other achievements.

This section should support credibility. If empty, it should not appear on the public card.

### Collaboration Formats

Required.

Prompt:

> Consultations, audits, ongoing support, mentoring, and other ways to work together.

This section should help visitors understand how they can engage with the user.

## Weekly Consultation Availability

After the user completes their profile details, they can configure weekly available time slots for consultations.

The availability editor should show a weekly calendar grouped by days of the week. The user should be able to interactively mark the time ranges when they are available for consultations.

The interface should support:

- selecting one or more slots per day
- editing slot start and end times
- removing slots
- leaving a day empty when the user is not available
- maintaining a separate list of exceptions when consultations should not be available
- saving availability as part of onboarding progress

The weekly schedule should represent recurring weekly availability, not one-off appointments.

Exceptions should override weekly availability. Examples include holidays, public holidays, personal days off, travel days, or any other date when the user does not want to accept bookings.

The exceptions interface should support:

- adding a specific calendar date
- removing a date from the exclusion list
- optionally adding a short note or label for the exclusion
- showing exceptions separately from recurring weekly slots

## Data Storage

All app data must be stored in MySQL.

The database should persist:

- onboarding completion state and current onboarding step
- profile photo metadata and references to stored image files
- name
- optional age
- professional profile text
- expertise text
- cases and results text
- optional experience and achievements text
- collaboration formats text
- weekly consultation availability slots
- booking exceptions
- visitor consultation requests
- timestamps for creation and updates

The app should never rely on local browser state as the source of truth for completed onboarding or profile data. Local state can be used for temporary UI interactions, but saved data must come from MySQL.

## Generated Website Card

After onboarding, the app should generate a website card that includes:

- profile photo or placeholder
- name
- optional age
- professional introduction
- expertise
- cases and results
- optional experience and achievements
- collaboration formats
- weekly consultation availability, when the user chooses to show it

The public page should be readable, polished, and easy to share. It should feel personal and professional, not like a generic resume template.

## Visitor Booking Flow

Anonymous visitors should be able to request a consultation from the public card page.

The visitor should see a weekly calendar with available consultation slots. The calendar should respect:

- recurring weekly availability
- exceptions
- already booked or unavailable slots, when booking storage is implemented

When the visitor selects an available slot, the app should open a modal asking for:

- name
- email
- phone
- short request description explaining what they need

The modal should clearly show the selected date and time slot. The visitor should be able to cancel and choose another slot.

Submitting the request should create a consultation request record in MySQL.

## Responsive Design

The entire app must be fully adapted for mobile devices.

Mobile requirements:

- onboarding steps should be comfortable to complete on a phone
- profile forms should avoid cramped multi-column layouts on small screens
- photo upload and preview should work well on mobile
- weekly availability editing should remain usable with touch interactions
- the generated public card should look polished on mobile, tablet, and desktop
- text, buttons, controls, and calendar slots must not overlap or overflow

The mobile experience is not a secondary view. It should be treated as a primary target.

## Editing Experience

After onboarding, the user should be able to:

- edit any section of the generated website
- edit any profile field
- replace the photo
- add consultation availability slots
- remove consultation availability slots
- add exceptions
- remove exceptions
- update weekly consultation availability
- preview the public card
- save changes

Future versions may add style themes, custom URLs, contact links, multilingual profiles, and AI-assisted rewriting.

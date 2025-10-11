# Class Info API Documentation

This document provides comprehensive documentation for all public APIs, functions, and components in the Class Info application.

## Table of Contents

1. [Backend APIs (Convex)](#backend-apis-convex)
   - [Notices API](#notices-api)
   - [Meals API](#meals-api)
   - [Timetable API](#timetable-api)
   - [Settings API](#settings-api)
   - [Files API](#files-api)
2. [Frontend Components](#frontend-components)
   - [Svelte Components](#svelte-components)
   - [Utility Functions](#utility-functions)
3. [Database Schema](#database-schema)
4. [Usage Examples](#usage-examples)

---

## Backend APIs (Convex)

### Notices API

The notices API manages class announcements, assignments, and notices.

#### Queries

##### `notices.list()`
Returns all notices sorted by due date.

**Returns:** `Array<Notice>`

```typescript
const notices = await client.query(api.notices.list);
```

##### `notices.currentGroups()`
Returns current and future notices grouped by date.

**Returns:** `Array<{date: string, displayDate: string, isToday: boolean, notices: MinimalNotice[]}>`

```typescript
const groups = await client.query(api.notices.currentGroups);
```

##### `notices.pastMonths()`
Returns past notices grouped by month.

**Returns:** `Array<{monthKey: string, monthName: string, total: number}>`

```typescript
const pastMonths = await client.query(api.notices.pastMonths);
```

##### `notices.pastByMonth(monthKey: string)`
Returns notices for a specific month.

**Parameters:**
- `monthKey`: String in format "YYYY-M" (e.g., "2024-1")

**Returns:** `Array<{date: string, displayDate: string, isToday: boolean, notices: MinimalNotice[]}>`

```typescript
const monthNotices = await client.query(api.notices.pastByMonth, { 
  monthKey: "2024-1" 
});
```

##### `notices.overview()`
Returns both current groups and past months in one call.

**Returns:** `{currentGroups: Array, pastMonths: Array}`

```typescript
const overview = await client.query(api.notices.overview);
```

##### `notices.detail(id: string)`
Returns a specific notice by ID or slug.

**Parameters:**
- `id`: Notice ID or slug

**Returns:** `{notice: Notice | null, files: File[]}`

```typescript
const detail = await client.query(api.notices.detail, { 
  id: "abc123" 
});
```

##### `notices.getById(id: Id<"notices">)`
Returns a notice by its database ID.

**Parameters:**
- `id`: Database ID

**Returns:** `Notice | null`

```typescript
const notice = await client.query(api.notices.getById, { 
  id: "j1234567890abcdef" 
});
```

#### Mutations

##### `notices.create(args)`
Creates a new notice.

**Parameters:**
```typescript
{
  title: string;
  subject: string;
  type: "수행평가" | "숙제" | "준비물" | "기타";
  description: string;
  dueDate: string; // YYYY-MM-DD format
  files?: Id<"files">[];
  slug?: string;
}
```

**Returns:** `Id<"notices">`

```typescript
const noticeId = await client.mutation(api.notices.create, {
  title: "수학 과제",
  subject: "수학",
  type: "숙제",
  description: "교과서 50-60페이지 문제 풀기",
  dueDate: "2024-01-15",
  files: []
});
```

##### `notices.update(args)`
Updates an existing notice.

**Parameters:**
```typescript
{
  id: Id<"notices">;
  title: string;
  subject: string;
  type: "수행평가" | "숙제" | "준비물" | "기타";
  description: string;
  dueDate: string;
  files?: Id<"files">[];
  slug?: string;
}
```

```typescript
await client.mutation(api.notices.update, {
  id: "j1234567890abcdef",
  title: "수학 과제 (수정됨)",
  subject: "수학",
  type: "숙제",
  description: "교과서 50-70페이지 문제 풀기",
  dueDate: "2024-01-16",
  files: []
});
```

##### `notices.remove(id: Id<"notices">)`
Deletes a notice.

**Parameters:**
- `id`: Notice ID

```typescript
await client.mutation(api.notices.remove, { 
  id: "j1234567890abcdef" 
});
```

##### `notices.backfillMissingSlugs()`
Adds slugs to existing notices that don't have them.

**Returns:** `{updated: number, results: Array<{id: string, slug: string}>}`

```typescript
const result = await client.mutation(api.notices.backfillMissingSlugs);
```

### Meals API

The meals API manages school meal data fetched from external sources.

#### Queries

##### `meals.getRange(startdate: string, enddate: string, mealType?: string)`
Returns meals within a date range.

**Parameters:**
- `startdate`: Start date in YYYYMMDD format
- `enddate`: End date in YYYYMMDD format  
- `mealType`: Optional meal type filter (e.g., "중식")

**Returns:** `Array<Meal>`

```typescript
const meals = await client.query(api.meals.getRange, {
  startdate: "20240101",
  enddate: "20240107",
  mealType: "중식"
});
```

##### `meals.getDisplayWeek()`
Returns the current week's meals for display.

**Returns:** `{meals: Array<Meal>, days: Array<{date: string, meal: Meal | null}>, weekOffset: number, startdate: string, enddate: string}`

```typescript
const weekData = await client.query(api.meals.getDisplayWeek);
```

##### `meals.getTwoWeeks()`
Returns both current and next week's meals.

**Returns:** `{thisWeek: WeekData, nextWeek: WeekData}`

```typescript
const twoWeeks = await client.query(api.meals.getTwoWeeks);
```

#### Internal Actions

##### `meals.fetchAndSave(startdate: string, enddate: string, schoolcode: string)`
Fetches meals from external API and saves to database.

**Parameters:**
- `startdate`: Start date in YYYYMMDD format
- `enddate`: End date in YYYYMMDD format
- `schoolcode`: School code

```typescript
await client.action(api.meals.fetchAndSave, {
  startdate: "20240101",
  enddate: "20240107", 
  schoolcode: "7081492"
});
```

##### `meals.fetchCurrentWeek(schoolcode: string)`
Fetches current week's meals.

**Parameters:**
- `schoolcode`: School code

```typescript
await client.action(api.meals.fetchCurrentWeek, {
  schoolcode: "7081492"
});
```

##### `meals.fetchNextWeek(schoolcode: string)`
Fetches next week's meals.

**Parameters:**
- `schoolcode`: School code

```typescript
await client.action(api.meals.fetchNextWeek, {
  schoolcode: "7081492"
});
```

### Timetable API

The timetable API manages class schedules.

#### Queries

##### `timetable.getByWeek(week: number)`
Returns timetable for a specific week.

**Parameters:**
- `week`: Week number (0 = current week, 1 = next week)

**Returns:** `Timetable | null`

```typescript
const timetable = await client.query(api.timetable.getByWeek, { 
  week: 0 
});
```

#### Internal Actions

##### `timetable.fetchAndSave(grade: number, classno: number, week: number, schoolcode: string)`
Fetches timetable from external API and saves to database.

**Parameters:**
- `grade`: Grade level
- `classno`: Class number
- `week`: Week number
- `schoolcode`: School code

**Returns:** `Id<"timetables">`

```typescript
const timetableId = await client.action(api.timetable.fetchAndSave, {
  grade: 3,
  classno: 4,
  week: 0,
  schoolcode: "7081492"
});
```

### Settings API

The settings API manages application settings.

#### Queries

##### `settings.verifyPin(pin: string)`
Verifies admin PIN.

**Parameters:**
- `pin`: PIN to verify

**Returns:** `boolean`

```typescript
const isValid = await client.query(api.settings.verifyPin, { 
  pin: "1234" 
});
```

#### Mutations

##### `settings.setPin(newPin: string)`
Sets new admin PIN.

**Parameters:**
- `newPin`: New PIN

```typescript
await client.mutation(api.settings.setPin, { 
  newPin: "5678" 
});
```

### Files API

The files API manages file uploads and storage.

#### Queries

##### `files.getFile(fileId: Id<"files">)`
Returns file metadata.

**Parameters:**
- `fileId`: File ID

**Returns:** `File | null`

```typescript
const file = await client.query(api.files.getFile, { 
  fileId: "j1234567890abcdef" 
});
```

##### `files.getNoticeFiles(noticeId: Id<"notices">)`
Returns files attached to a notice.

**Parameters:**
- `noticeId`: Notice ID

**Returns:** `Array<File>`

```typescript
const files = await client.query(api.files.getNoticeFiles, { 
  noticeId: "j1234567890abcdef" 
});
```

#### Mutations

##### `files.createFileRecord(args)`
Creates a file record in the database.

**Parameters:**
```typescript
{
  name: string;
  type: string;
  size: number;
  url: string;
  storageId: string;
}
```

**Returns:** `Id<"files">`

```typescript
const fileId = await client.mutation(api.files.createFileRecord, {
  name: "document.pdf",
  type: "application/pdf",
  size: 1024000,
  url: "https://files.timefor.school/abc123.pdf",
  storageId: "abc123.pdf"
});
```

##### `files.updateFileMetadata(fileId: Id<"files">, name: string, type: string, size: number)`
Updates file metadata.

**Parameters:**
- `fileId`: File ID
- `name`: File name
- `type`: MIME type
- `size`: File size in bytes

```typescript
await client.mutation(api.files.updateFileMetadata, {
  fileId: "j1234567890abcdef",
  name: "updated-document.pdf",
  type: "application/pdf",
  size: 1024000
});
```

##### `files.updateFileMetadataByStorageId(storageId: string, name: string, type: string, size: number)`
Updates file metadata by storage ID.

**Parameters:**
- `storageId`: Storage ID
- `name`: File name
- `type`: MIME type
- `size`: File size in bytes

**Returns:** `Id<"files">`

```typescript
const fileId = await client.mutation(api.files.updateFileMetadataByStorageId, {
  storageId: "abc123.pdf",
  name: "document.pdf",
  type: "application/pdf",
  size: 1024000
});
```

##### `files.deleteFile(fileId: Id<"files">)`
Deletes a file from storage and database.

**Parameters:**
- `fileId`: File ID

```typescript
await client.mutation(api.files.deleteFile, { 
  fileId: "j1234567890abcdef" 
});
```

#### File Upload

##### `files.generateUploadUrl()`
Generates a signed upload URL for file uploads.

**Returns:** `{uploadUrl: string, storageId: string}`

```typescript
const { uploadUrl, storageId } = await client.mutation(api.files.generateUploadUrl);
```

---

## Frontend Components

### Svelte Components

#### `NoticeCard.svelte`

Displays a single notice card with type, subject, title, and summary.

**Props:**
```typescript
{
  notice: {
    _id: string;
    title: string;
    subject: string;
    type: "수행평가" | "숙제" | "준비물" | "기타";
    dueDate: string;
    summary?: string;
    hasFiles: boolean;
    slug?: string;
  };
  isPast?: boolean; // Optional: whether this is a past notice
}
```

**Usage:**
```svelte
<NoticeCard {notice} isPast={false} />
```

**Features:**
- Responsive design with mobile-first approach
- Type-based color coding
- File attachment indicator
- Clickable when notice has content or files
- Dark mode support

#### `NoticeGroup.svelte`

Groups notices by date and displays them with a date header.

**Props:**
```typescript
{
  group: {
    date: string;
    displayDate: string;
    isToday: boolean;
    notices: Array<Notice>;
  };
  isPast?: boolean; // Optional: whether this is a past group
}
```

**Usage:**
```svelte
<NoticeGroup {group} isPast={false} />
```

**Features:**
- Date-based grouping
- Different styling for past vs current notices
- Responsive layout

#### `FileUpload.svelte`

Handles file uploads with drag-and-drop support.

**Props:**
```typescript
{
  files: Array<Id<"files">>; // Array of file IDs
  onFilesChange: (fileIds: Id<"files">[]) => void; // Callback when files change
}
```

**Usage:**
```svelte
<FileUpload 
  files={fileIds} 
  onFilesChange={handleFilesChange} 
/>
```

**Features:**
- Drag and drop support
- File type validation (images and PDFs only)
- File size validation (10MB max)
- Markdown copy functionality
- File preview with icons
- Progress indication

#### `EmptyState.svelte`

Displays when no notices are available.

**Usage:**
```svelte
<EmptyState />
```

#### `LoadingState.svelte`

Displays loading indicator.

**Usage:**
```svelte
<LoadingState />
```

#### `ErrorState.svelte`

Displays error messages with retry functionality.

**Props:**
```typescript
{
  error: any; // Error object to display
}
```

**Usage:**
```svelte
<ErrorState {error} />
```

### Utility Functions

#### `getTypeColor(type: string): string`

Returns CSS classes for notice type styling.

**Parameters:**
- `type`: Notice type string

**Returns:** CSS class string

```typescript
import { getTypeColor } from '$lib/utils';

const colorClass = getTypeColor('수행평가'); // Returns color classes
```

#### `getFirstLine(text: string): string`

Extracts and cleans the first line of text, removing markdown formatting.

**Parameters:**
- `text`: Input text with potential markdown

**Returns:** Cleaned first line

```typescript
import { getFirstLine } from '$lib/utils';

const summary = getFirstLine('# **Bold** header\nSecond line');
// Returns: "Bold header"
```

#### `generateCopyText(groups: any[]): string`

Generates formatted text for copying notices to clipboard.

**Parameters:**
- `groups`: Array of notice groups

**Returns:** Formatted text string

```typescript
import { generateCopyText } from '$lib/utils';

const copyText = generateCopyText(noticeGroups);
navigator.clipboard.writeText(copyText);
```

#### `formatDate(dateString: string): string`

Formats a date string to Korean format.

**Parameters:**
- `dateString`: Date string (YYYY-MM-DD)

**Returns:** Formatted date string

```typescript
import { formatDate } from '$lib/utils';

const formatted = formatDate('2024-01-15');
// Returns: "2024년 1월 15일 (월)"
```

#### `truncateTitle(title: string): string`

Truncates title to 18 characters.

**Parameters:**
- `title`: Title string

**Returns:** Truncated title

```typescript
import { truncateTitle } from '$lib/utils';

const short = truncateTitle('Very long title that exceeds limit');
// Returns: "Very long title t"
```

#### `formatKoreanDueDate(dateString: string): string`

Formats due date in Korean style.

**Parameters:**
- `dateString`: Date string (YYYY-MM-DD)

**Returns:** Korean formatted due date

```typescript
import { formatKoreanDueDate } from '$lib/utils';

const dueDate = formatKoreanDueDate('2024-01-15');
// Returns: "1월 15일(월)까지"
```

---

## Database Schema

### Tables

#### `notices`
Stores class notices and announcements.

```typescript
{
  _id: Id<"notices">;
  title: string;
  subject: string;
  type: "수행평가" | "숙제" | "준비물" | "기타";
  description: string;
  dueDate: string; // YYYY-MM-DD format
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  files?: Id<"files">[];
  slug?: string;
}
```

**Indexes:**
- `by_due_date`: On `dueDate` field
- `by_slug`: On `slug` field

#### `files`
Stores file metadata and URLs.

```typescript
{
  _id: Id<"files">;
  name: string;
  type: string; // MIME type
  size: number; // bytes
  url: string; // R2 URL
  storageId: string; // R2 storage ID
  uploadedAt: number; // timestamp
}
```

#### `timetables`
Stores class schedules.

```typescript
{
  _id: Id<"timetables">;
  day_time: string[];
  timetable: Array<Array<{
    period: number;
    subject: string;
    teacher: string;
    replaced: boolean;
    original: {
      period: number;
      subject: string;
      teacher: string;
    } | null;
  }>>;
  update_date: string;
  week: number;
  editedAt: number; // timestamp
}
```

#### `settings`
Stores application settings.

```typescript
{
  _id: Id<"settings">;
  key: string;
  value: string;
}
```

**Indexes:**
- `by_key`: On `key` field

#### `meals`
Stores school meal data.

```typescript
{
  _id: Id<"meals">;
  date: string; // YYYYMMDD format
  mealType: string; // e.g., "중식"
  dishes: string[]; // array of dish names
  originInfo: string; // raw origin info
  calories: string | null; // e.g., "685.4 Kcal"
  nutrients: string | null; // raw nutrition info
  schoolCode: string;
  schoolName: string;
  loadedAt: string; // YYYYMMDD format
  editedAt: number; // timestamp
}
```

**Indexes:**
- `by_date`: On `date` field
- `by_date_type`: On `date` and `mealType` fields

---

## Usage Examples

### Creating a Notice

```typescript
import { useConvexClient } from 'convex-svelte';
import { api } from '@class-info/backend/convex/_generated/api';

const client = useConvexClient();

async function createNotice() {
  try {
    const noticeId = await client.mutation(api.notices.create, {
      title: "수학 수행평가",
      subject: "수학",
      type: "수행평가",
      description: "## 수행평가 안내\n\n- 일시: 1월 20일\n- 범위: 3단원 전체\n- 형식: 서술형",
      dueDate: "2024-01-20",
      files: []
    });
    console.log('Notice created:', noticeId);
  } catch (error) {
    console.error('Error creating notice:', error);
  }
}
```

### Fetching Current Notices

```typescript
import { useQuery } from 'convex-svelte';
import { api } from '@class-info/backend/convex/_generated/api';

// In a Svelte component
const overview = useQuery(api.notices.overview);

// Access data
$: if (overview.data) {
  const currentGroups = overview.data.currentGroups;
  const pastMonths = overview.data.pastMonths;
}
```

### File Upload

```typescript
import { useUploadFile } from "@convex-dev/r2/svelte";
import { api } from "@class-info/backend/convex/_generated/api";

const uploadFile = useUploadFile(api.files);

async function handleFileUpload(file: File) {
  try {
    // Upload file to R2
    const storageId = await uploadFile(file);
    
    // Update file metadata
    const fileId = await client.mutation(api.files.updateFileMetadataByStorageId, {
      storageId,
      name: file.name,
      type: file.type,
      size: file.size,
    });
    
    return fileId;
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

### Admin Authentication

```typescript
import { useConvexClient } from 'convex-svelte';
import { api } from '@class-info/backend/convex/_generated/api';

const client = useConvexClient();

async function verifyAdmin(pin: string) {
  try {
    const isValid = await client.query(api.settings.verifyPin, { pin });
    if (isValid) {
      // Set admin session
      sessionStorage.setItem('admin', 'true');
    }
    return isValid;
  } catch (error) {
    console.error('PIN verification failed:', error);
    return false;
  }
}
```

### Meal Data Integration

```typescript
// Fetch current week's meals
const weekData = await client.query(api.meals.getDisplayWeek);

// Access meal data
weekData.days.forEach(day => {
  if (day.meal) {
    console.log(`${day.date}: ${day.meal.dishes.join(', ')}`);
  }
});
```

### Timetable Integration

```typescript
// Fetch current week's timetable
const timetable = await client.query(api.timetable.getByWeek, { week: 0 });

if (timetable) {
  timetable.timetable.forEach((daySchedule, dayIndex) => {
    console.log(`Day ${dayIndex + 1}:`);
    daySchedule.forEach(period => {
      console.log(`  Period ${period.period}: ${period.subject} (${period.teacher})`);
    });
  });
}
```

---

## Error Handling

All API calls should be wrapped in try-catch blocks:

```typescript
try {
  const result = await client.query(api.notices.list);
  // Handle success
} catch (error) {
  console.error('API Error:', error);
  // Handle error (show user message, retry, etc.)
}
```

## Type Safety

The application uses TypeScript with generated types from Convex. Import types from:

```typescript
import type { Id } from "@class-info/backend/convex/_generated/dataModel";
import { api } from "@class-info/backend/convex/_generated/api";
```

## Real-time Updates

Convex queries automatically update when data changes. Use the `useQuery` hook in Svelte components for reactive data:

```typescript
const notices = useQuery(api.notices.overview);
// Component will re-render when notices data changes
```
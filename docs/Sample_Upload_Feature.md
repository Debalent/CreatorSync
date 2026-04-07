# User Sample Upload Feature

## Overview
The sample upload feature allows users to upload, manage, edit, and delete their own custom audio samples for use in the Beat Maker. This provides users with the flexibility to build personalized sample libraries.

## Features

### 1. Sample Upload
- **File Types**: MP3, WAV, FLAC, AAC, OGG, WebM audio formats
- **Size Limit**: 50MB per file
- **Metadata**: Name, category, BPM, key, tags, public/private visibility
- **Progress Tracking**: Real-time upload progress indicator
- **Authentication**: Requires logged-in user

### 2. Sample Management
- **My Samples Tab**: Separate view for user-uploaded samples
- **Library Tab**: Platform-provided samples
- **Edit Metadata**: Update sample information after upload
- **Delete Samples**: Remove samples with confirmation
- **Preview Playback**: Listen to samples before using

### 3. Integration
- **Drag & Drop**: Use uploaded samples in beat maker tracks
- **Search & Filter**: Find samples by category, name, or tags
- **Ownership**: Users can only edit/delete their own samples
- **Public Sharing**: Option to make samples public for community

## Technical Implementation

### Backend API Routes

#### POST `/api/beat-maker/samples/upload`
Upload a new sample with multipart form data.

**Request**:
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `multipart/form-data`
  - `sample` (file): Audio file
  - `name` (string): Sample name
  - `category` (string): Category
  - `bpm` (number): Optional BPM
  - `key` (string): Optional musical key
  - `tags` (string): Comma-separated tags
  - `isPublic` (boolean): Public visibility

**Response**:
```json
{
  "success": true,
  "message": "Sample uploaded successfully",
  "sample": {
    "_id": "...",
    "name": "My Kick",
    "fileUrl": "/uploads/samples/...",
    "category": "Drums",
    "uploadedBy": "userId",
    "isPublic": false
  }
}
```

#### GET `/api/beat-maker/samples/my-samples`
Get user's uploaded samples with optional filtering.

**Query Parameters**:
- `category`: Filter by category
- `search`: Search in name/tags

**Response**:
```json
{
  "success": true,
  "samples": [...]
}
```

#### PUT `/api/beat-maker/samples/:id`
Update sample metadata (requires ownership).

**Request**:
```json
{
  "name": "Updated Name",
  "category": "Bass",
  "bpm": 128,
  "key": "Am",
  "tags": "808, sub, deep",
  "isPublic": true
}
```

#### DELETE `/api/beat-maker/samples/:id`
Delete sample file and database record (requires ownership).

### Frontend Implementation

#### BeatMakerSamples Class
Located in `public/js/beat-maker-samples.js`

**Key Methods**:
- `uploadSample()`: Handle file upload with progress tracking
- `loadUserSamples()`: Fetch user's samples from API
- `renderUserSamples()`: Display samples in UI
- `editSample(id)`: Open edit modal with sample data
- `updateSample()`: Save metadata changes
- `deleteSample()`: Remove sample with confirmation
- `switchTab(tab)`: Toggle between Library and My Samples

#### UI Components

**Upload Modal** (`uploadSampleModal`):
- File input with accept filter
- Name, category, BPM, key inputs
- Tags text field
- Public/private checkbox
- Progress bar

**Edit Modal** (`editSampleModal`):
- Pre-populated form fields
- Update button
- Delete button with confirmation

**Samples Tabs**:
- Library tab (platform samples)
- My Samples tab (user uploads)
- Active state styling

### File Storage

**Location**: `/public/uploads/samples/`
**Naming**: UUID v4 + original extension
**Example**: `a3f8b2c1-4e5d-6f7g-8h9i-0j1k2l3m4n5o.wav`

### Security

1. **Authentication**: JWT token required for all operations
2. **Ownership Verification**: Users can only modify their own samples
3. **File Validation**: 
   - MIME type checking (audio/* only)
   - File size limit (50MB)
   - Extension whitelist
4. **Error Cleanup**: Failed uploads automatically delete partial files
5. **Rate Limiting**: Upload endpoint uses `uploadLimiter` middleware

### Database Schema

```javascript
{
  name: String (required, indexed),
  fileUrl: String (required),
  category: String (required, indexed),
  bpm: Number (optional),
  key: String (optional),
  tags: [String] (optional, indexed),
  duration: Number (optional),
  fileSize: Number (optional),
  uploadedBy: ObjectId (required, indexed),
  isPublic: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

## User Workflows

### Upload Workflow
1. User clicks "Upload Sample" button
2. Select audio file from device
3. Fill in metadata (name, category, BPM, etc.)
4. Toggle public/private visibility
5. Click Submit
6. Progress bar shows upload status
7. Sample appears in "My Samples" tab

### Edit Workflow
1. Navigate to "My Samples" tab
2. Hover over sample to reveal actions
3. Click edit icon
4. Modify metadata fields
5. Click Update
6. Changes reflected immediately

### Delete Workflow
1. Open edit modal for sample
2. Click Delete button
3. Confirm deletion in dialog
4. Sample removed from database and filesystem

### Use in Beat Maker
1. Find sample in Library or My Samples
2. Click to load into track
3. Sample available in sequencer
4. Drag to timeline or trigger with pads

## Future Enhancements

### Storage Management
- Display total storage used per user
- Storage limits based on subscription tier
- Bulk delete functionality
- Archive/favorite system

### Audio Processing
- Automatic waveform generation
- BPM/key auto-detection
- Sample trimming/cropping
- Normalize/optimize audio

### Collaboration
- Share samples with specific users
- Sample collections/packs
- Community sample marketplace
- Sample licensing options

### Advanced Features
- Drag-and-drop file upload
- Batch upload multiple files
- Sample versioning
- Download sample packs
- AI-powered tagging suggestions

## Testing

### Manual Testing Checklist
- [ ] Upload valid audio file succeeds
- [ ] Upload non-audio file fails with error
- [ ] Upload >50MB file fails with error
- [ ] Progress bar updates during upload
- [ ] Sample appears in My Samples tab
- [ ] Edit modal populates with correct data
- [ ] Update saves changes successfully
- [ ] Delete removes file and database entry
- [ ] Tab switching filters samples correctly
- [ ] Preview playback works
- [ ] Unauthorized users blocked from upload
- [ ] Users cannot edit others' samples

### API Testing with curl

**Upload Sample**:
```bash
curl -X POST http://localhost:3000/api/beat-maker/samples/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "sample=@kick.wav" \
  -F "name=808 Kick" \
  -F "category=Drums" \
  -F "bpm=128" \
  -F "isPublic=false"
```

**Get My Samples**:
```bash
curl http://localhost:3000/api/beat-maker/samples/my-samples \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Update Sample**:
```bash
curl -X PUT http://localhost:3000/api/beat-maker/samples/SAMPLE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","bpm":140}'
```

**Delete Sample**:
```bash
curl -X DELETE http://localhost:3000/api/beat-maker/samples/SAMPLE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Configuration

### Environment Variables
No additional environment variables required. Uses existing:
- `JWT_SECRET`: For authentication
- `MONGODB_URI`: Database connection

### Multer Configuration
```javascript
const storage = multer.diskStorage({
  destination: './public/uploads/samples/',
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'));
    }
  }
});
```

## Error Handling

### Client-Side Errors
- File size exceeded: "File size must be under 50MB"
- Invalid file type: "Only audio files allowed"
- Network error: "Failed to upload sample"
- Unauthorized: "Please log in to upload samples"

### Server-Side Errors
- Missing file: 400 - "No file uploaded"
- Invalid format: 400 - "Invalid file format"
- Upload error: 500 - "Failed to save sample"
- Not found: 404 - "Sample not found"
- Forbidden: 403 - "You don't have permission to modify this sample"

## Dependencies

### Backend
- `multer`: File upload handling
- `uuid`: Unique filename generation
- `fs/promises`: Async file operations
- `path`: File path utilities

### Frontend
- XMLHttpRequest: Upload progress tracking
- FormData: Multipart form submission
- Fetch API: REST API calls

## Performance Considerations

1. **File Size**: 50MB limit prevents excessive uploads
2. **Storage**: Files stored on filesystem, not database
3. **Indexing**: Database indexes on name, category, uploadedBy, tags
4. **Lazy Loading**: Samples loaded on-demand per tab
5. **Caching**: Consider CDN for frequently used samples

## Maintenance

### Storage Cleanup
Periodically check for orphaned files (files without database records):

```bash
# Find files in uploads/samples/ not in database
# Create cleanup script if needed
```

### Database Cleanup
Remove sample records where files no longer exist:

```javascript
// Cleanup script example
const samples = await Sample.find();
for (const sample of samples) {
  if (!fs.existsSync(sample.fileUrl)) {
    await Sample.deleteOne({ _id: sample._id });
  }
}
```

## Related Documentation
- [Beat Maker Development Guide](./Development_Guide.md)
- [Technical Architecture](./Technical_Architecture_Guide.md)
- [API Documentation](../server/routes/samples.js)
- [CreatorSync Instructions](../.github/copilot-instructions.md)

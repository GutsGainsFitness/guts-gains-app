UPDATE storage.buckets
SET 
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime'
  ]
WHERE id = 'exercise-illustrations';
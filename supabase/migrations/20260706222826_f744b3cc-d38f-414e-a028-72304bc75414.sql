
CREATE POLICY "Public read exercise-media" ON storage.objects FOR SELECT USING (bucket_id = 'exercise-media');
CREATE POLICY "Public insert exercise-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exercise-media');
CREATE POLICY "Public update exercise-media" ON storage.objects FOR UPDATE USING (bucket_id = 'exercise-media');
CREATE POLICY "Public delete exercise-media" ON storage.objects FOR DELETE USING (bucket_id = 'exercise-media');


CREATE POLICY "auth read avaliacao-fotos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avaliacao-fotos');
CREATE POLICY "auth insert avaliacao-fotos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avaliacao-fotos');
CREATE POLICY "auth update avaliacao-fotos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avaliacao-fotos');
CREATE POLICY "auth delete avaliacao-fotos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avaliacao-fotos');

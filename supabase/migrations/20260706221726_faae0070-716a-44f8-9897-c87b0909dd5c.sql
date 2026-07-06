
CREATE TABLE public.equipments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.equipments TO anon, authenticated;
GRANT ALL ON public.equipments TO service_role;

ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read equipments" ON public.equipments FOR SELECT USING (true);

INSERT INTO public.equipments (name, slug, sort_order) VALUES
('Anilha','anilha',10),
('Banco','banco',20),
('Barra','barra',30),
('Barra Fixa','barra-fixa',40),
('Barra H','barra-h',50),
('Barra Paralela','barra-paralela',60),
('Barra Reta','barra-reta',70),
('Barra W (EZ)','barra-w-ez',80),
('Bicicleta Ergométrica','bicicleta-ergometrica',90),
('Bike Spinning','bike-spinning',100),
('Bola Suíça','bola-suica',110),
('Cabo / Polia','cabo-polia',120),
('Caixote','caixote',130),
('Caneleiras','caneleiras',140),
('Cone','cone',150),
('Corda','corda',160),
('Corda Naval','corda-naval',170),
('Elástico / Banda','elastico-banda',180),
('Elíptico','eliptico',190),
('Escada Ergométrica','escada-ergometrica',200),
('Escada de Agilidade','escada-agilidade',210),
('Esteira','esteira',220),
('Graviton','graviton',230),
('Halter','halter',240),
('Halteres','halteres',250),
('Kettlebell','kettlebell',260),
('Máquina','maquina',270),
('Paralela','paralela',280),
('Peso Corporal','peso-corporal',290),
('Polia/Cabo','polia-cabo',300),
('Remo Ergômetro','remo-ergometro',310),
('Roda Abdominal','roda-abdominal',320),
('Smith','smith',330),
('Smith Machine','smith-machine',340),
('Step','step',350),
('TRX / Suspensão','trx-suspensao',360);

ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS objective TEXT;

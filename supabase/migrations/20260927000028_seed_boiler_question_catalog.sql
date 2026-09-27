-- Small reusable customer-observable Stage 3 question catalog.
BEGIN;
CREATE TEMP TABLE stage3_question_seed (
  question_key text PRIMARY KEY, question_text text NOT NULL,
  evidence_group text NOT NULL, is_safety_question boolean NOT NULL,
  priority integer NOT NULL, answer_options jsonb NOT NULL,
  CHECK (length(trim(question_text)) > 0),
  CHECK (length(trim(evidence_group)) > 0),
  CHECK (jsonb_typeof(answer_options) = 'array')
) ON COMMIT DROP;
INSERT INTO stage3_question_seed VALUES
  ('gas_other_appliance', 'Evinizdeki başka bir gazlı cihaz (örneğin ocak) normal çalışıyor mu?', 'household_gas_availability', false, 80, '["yes", "no", "unknown"]'::jsonb),
  ('display_low_water_pressure', 'Cihazın kullanıcı göstergesinde su basıncı düşük görünüyor mu?', 'display_water_pressure', false, 70, '["yes", "no", "unknown"]'::jsonb),
  ('visible_water_leak', 'Cihazın dışından görülebilen su kaçağı var mı?', 'visible_water_leak', false, 60, '["yes", "no", "unknown"]'::jsonb),
  ('abnormal_fan_noise', 'Cihaz çalışmaya çalışırken olağandışı sürtme veya uğultu sesi duyuyor musunuz?', 'abnormal_running_noise', false, 50, '["yes", "no", "unknown"]'::jsonb),
  ('safety_gas_smell', 'Gaz kokusu alıyor musunuz?', 'safety_gas_smell', true, 100, '["yes", "no", "unknown"]'::jsonb);
DO $$ BEGIN
  IF (SELECT count(*) FROM stage3_question_seed) <> 5 THEN
    RAISE EXCEPTION 'Stage 3 question count differs';
  END IF;
  IF EXISTS (SELECT 1 FROM stage3_question_seed s CROSS JOIN LATERAL jsonb_array_elements_text(s.answer_options) a(answer_key)
             WHERE a.answer_key NOT IN ('yes','no','unknown')) THEN
    RAISE EXCEPTION 'Invalid Stage 3 answer key';
  END IF;
  IF EXISTS (SELECT 1 FROM stage3_question_seed s JOIN public.boiler_diagnostic_questions q USING(question_key)
             WHERE q.question_text <> s.question_text OR q.evidence_group <> s.evidence_group
               OR q.answer_options <> s.answer_options OR q.is_safety_question <> s.is_safety_question
               OR q.answer_type <> 'single_choice' OR q.priority <> s.priority
               OR q.customer_observable <> true OR q.is_active <> true) THEN
    RAISE EXCEPTION 'Existing Stage 3 question conflicts with seed';
  END IF;
  IF EXISTS (SELECT 1 FROM stage3_question_seed s JOIN public.boiler_diagnostic_questions q
             ON q.evidence_group=s.evidence_group AND q.question_key<>s.question_key) THEN
    RAISE EXCEPTION 'Existing question duplicates a Stage 3 evidence group';
  END IF;
END $$;
INSERT INTO public.boiler_diagnostic_questions
  (question_key,question_text,answer_type,answer_options,evidence_group,
   customer_observable,is_safety_question,priority,is_active)
SELECT s.question_key,s.question_text,'single_choice',s.answer_options,s.evidence_group,
  true,s.is_safety_question,s.priority,true
FROM stage3_question_seed s
WHERE NOT EXISTS (SELECT 1 FROM public.boiler_diagnostic_questions q WHERE q.question_key=s.question_key);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.boiler_diagnostic_questions q JOIN stage3_question_seed s USING(question_key)) <> 5 THEN
    RAISE EXCEPTION 'Stage 3 questions missing after seed';
  END IF;
END $$;
COMMIT;

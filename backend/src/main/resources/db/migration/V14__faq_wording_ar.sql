-- Libellé arabe du bloc FAQ : « أسئلة متكررة » (et non « أسئلة شائعة »).
UPDATE blog_post SET content = REPLACE(content, 'أسئلة شائعة', 'أسئلة متكررة') WHERE content LIKE '%أسئلة شائعة%';

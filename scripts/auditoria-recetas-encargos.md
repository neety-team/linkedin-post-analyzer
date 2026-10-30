# Auditoría de las recetas (encargos 1 y 2 el primer lunes de cada mes; encargo 3 cada lunes y cuando se detecta una regla por defecto mal puesta)

Dos agentes en paralelo, solo lectura, con estos encargos tal cual. Lo que devuelvan se aplica el mismo día: cada regla movida o borrada, con su dueño (`scripts/test-cobertura-reglas.py` en verde). Origen: auditoría del 2026-10-28, que encontró 18 reglas mal ubicadas y 20 contradicciones o reglas caducadas.

## Encargo 1 · Dónde vive cada regla

Eres un auditor de documentación. Repo: C:/Users/LENOVO/Desktop/linkedin-post-analyzer. Las recetas con las que se escriben los posts de LinkedIn de las 3 cuentas de fundadores (Iker, Unai, Asier) viven en docs/skills/: global-instructions.md (reglas globales del texto), post-workflow.md (runbooks por pilar en §4.x, planificador en §8), brand-voice.md (voz; §1b son reglas POR CUENTA), working-preferences.md (cómo se entrega), aboutme.md (identidad e ICP) e images.md. Son ficheros muy grandes: léelos por trozos (Read con offset y limit) o busca con Grep. Lee cada sección con regla dura (títulos con ⛔, CANÓNICO o GLOBAL, y frases tipo "la regla", "nunca", "siempre").

Principio de la casa (working-preferences §0c-BIS y brand-voice §1b): una regla universal guardada dentro de un caso particular (un pilar o una cuenta) se rompe en todos los demás. Toda corrección de un jefe que proteja la imagen de la marca es GLOBAL; lo que es su voz se queda en su cuenta.

Tarea (solo lectura, NO edites nada). Encuentra reglas mal ubicadas, en las dos direcciones:
- (A) Reglas que viven solo en un runbook de pilar o en la sección de una cuenta, pero que por su contenido aplican a cualquier pilar o cuenta. Comprueba antes con Grep si global-instructions ya la tiene; si ya está, no es hallazgo.
- (B) Reglas en global que en realidad solo valen para un pilar o una cuenta, y que siendo globales empujarían a hacer mal los demás.

Devuelve como máximo 20 hallazgos, ordenados por impacto. Cada uno con: fichero:línea, título de la sección, qué dice la regla en una frase, dónde vive hoy, dónde debería vivir y por qué (con la frase que lo demuestra), y confianza (alta o media).

## Encargo 2 · Contradicciones y reglas caducadas

Eres un auditor de documentación. Repo: C:/Users/LENOVO/Desktop/linkedin-post-analyzer. Las recetas viven en docs/skills/: global-instructions.md, post-workflow.md, brand-voice.md, working-preferences.md, aboutme.md, images.md, swipe-file.md y outliers-database.md (§4 = histórico real de nuestras cuentas, manda sobre §3). El validador es scripts/validar-post.py. Las recetas crecen con correcciones fechadas: a veces la nueva tacha la vieja o la marca con 🔄, y otras veces se quedan las dos vivas.

Tarea (solo lectura, NO edites nada). Encuentra:
1. Contradicciones vivas: dos reglas no marcadas como sustituidas que mandan cosas incompatibles, entre ficheros o dentro del mismo.
2. Reglas caducadas escritas como vigentes: tienen una fecha de caducidad ya pasada, apuntan a URLs o puertas retiradas o hablan de pilares vetados.
3. Checks del validador que contradicen la receta: un check que exige algo que la receta ya cambió.

Devuelve como máximo 20 hallazgos, ordenados por impacto. Cada uno con: los dos sitios (fichero:línea) y la frase exacta de cada uno, qué choca, cuál parece la vigente según la fecha o la marca 🔄, y confianza (alta o media).

## Encargo 3 · Reglas por defecto sin dato (cada lunes, desde el 2026-10-30)

Auditoría de solo lectura (no edites nada) de las recetas en C:/Users/LENOVO/Desktop/linkedin-post-analyzer/docs/skills/: global-instructions.md, post-workflow.md, images.md, brand-voice.md, working-preferences.md, video.md, email-marketing.md y lead-magnet-web.md. Son las reglas con las que se escriben los posts de LinkedIn de 3 cuentas de fundadores de una startup B2B. Son ficheros muy grandes: léelos por trozos o busca con Grep.

Contexto: el 30/10 aparecieron dos reglas que se aplicaban solas y estaban mal: "toda imagen lleva una palabra en naranja" (en un meme roba la atención al dibujo) y "sin evento abierto, el enlace va a /solicitar-demo" (sin razonar qué destino era más coherente para cada post). Busca OTRAS del mismo tipo: reglas que fijan un valor por defecto o un "siempre / nunca / todo X lleva Y" (busca "por defecto", "siempre", "toda ", "todo ", "cada ", "nunca", y tablas de puerta por pilar, horarios, longitudes y formatos fijos). Para cada una evalúa:
- si tiene un dato medido escrito al lado (impresiones, CTR, n) o es criterio sin medir;
- si choca con una corrección posterior que no se propagó (da las dos ubicaciones);
- si se aplica a casos donde su motivo no se cumple.

Ignora las que tienen dato propio claro y no chocan con nada. Prioriza las que afectan a muchas publicaciones (destino del enlace, formato, imagen, horario, longitud, ninja, gancho). Devuelve como máximo 12 hallazgos ordenados por impacto, cada uno con fichero:línea, la regla en una línea, el problema y una propuesta de cambio en una frase. Al final, una lista corta de las reglas por defecto que sí están bien respaldadas. Sé escéptico: lo que no tengas claro, márcalo como duda. Compara con los hallazgos ya aplicados en semanas anteriores para no repetirlos.

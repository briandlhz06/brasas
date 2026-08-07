# Seguridad

Si el texto o la clave llegan al server, si un secreto se puede leer dos veces, o si hay XSS que saque la clave del `#`, mail a briandlhz06@proton.me con "brasas" en el asunto. No abras un issue público para eso.

El host del JS es parte de la confianza: si no controlás el deploy, no asumas que el server no ve nada. Sin HTTPS no hay nada que discutir. El server no ve el texto; sí ve tamaño aproximado (va en buckets), TTL e IP. No hay rate limit: si lo exponés, poné un límite adelante.

Arreglos en `main`.

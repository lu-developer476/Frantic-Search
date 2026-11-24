# HaxeFlixel para los minijuegos

Los cuatro minijuegos independientes usan un único runtime HTML5 compilado con HaxeFlixel: Persecusión, Cacería, Emboscada y Breaking Race. Cada modo se instancia como un estado HaxeFlixel distinto. La interfaz de navegación, los paneles de instrucciones, el idioma y la integración con el menú continúan en JavaScript/Vite.

La Campaña sigue ejecutándose en su Canvas y en sus sistemas actuales. No se importa HaxeFlixel en su bucle de juego ni se modifican sus sistemas de progresión o guardado.

## Compilación local

Se necesita Haxe y Haxelib instalados. El script instala HaxeFlixel si falta y genera el runtime HTML5 dentro de `public/haxeflixel`:

```bash
bash scripts/build-haxeflixel.sh
VITE_HAXEFLIXEL=1 npm run build
```

El build habitual de Vite sigue disponible para tareas web que no necesiten compilar el motor. El despliegue de Vercel y el workflow de GitHub Actions compilan HaxeFlixel antes de empaquetar la aplicación.

## Comunicación

El host JavaScript envía comandos `open`, `start`, `pause`, `resume`, `locale` y `exit` mediante `postMessage`. El runtime devuelve eventos de listo, pausa, finalización y salida. Así se mantiene un único contexto de motor y no se crean cuatro instancias WebGL simultáneas.

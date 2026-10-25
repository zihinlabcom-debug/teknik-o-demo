import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier.endsWith('t100-local-db.mjs'))return next(new URL('../../supabase/tests/t102-local-db.mjs',import.meta.url).href,context);return next(specifier,context);}});

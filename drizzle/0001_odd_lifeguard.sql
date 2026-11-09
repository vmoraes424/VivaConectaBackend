ALTER TABLE "indicacoes" ADD COLUMN "negocio_status" text;--> statement-breakpoint
ALTER TABLE "indicacoes" ADD COLUMN "negocio_valor" double precision;--> statement-breakpoint
ALTER TABLE "indicacoes" ADD COLUMN "negocio_moeda" text;--> statement-breakpoint
ALTER TABLE "indicacoes" ADD COLUMN "negocio_fechado_em" text;--> statement-breakpoint
ALTER TABLE "indicacoes" ADD COLUMN "negocio_marcado_por" text;--> statement-breakpoint
ALTER TABLE "indicacoes" ADD COLUMN "negocio_marcado_em" timestamp with time zone;
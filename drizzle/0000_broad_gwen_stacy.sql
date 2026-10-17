CREATE TABLE "especialidades" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"nome_normalizado" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "especialidades_nome_normalizado_unique" UNIQUE("nome_normalizado")
);
--> statement-breakpoint
CREATE TABLE "parceiros" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"empresa" text,
	"avatar_url" text,
	"localidade" text,
	"especialidade_id" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"whatsapp" text NOT NULL,
	"comissao_tipo" text NOT NULL,
	"comissao_valor" double precision NOT NULL,
	"comissao_moeda" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicacoes" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"parceiro_id" text NOT NULL,
	"cliente_nome" text NOT NULL,
	"cliente_whatsapp" text NOT NULL,
	"cliente_email" text,
	"servico" text NOT NULL,
	"observacao" text DEFAULT '',
	"autorizou_compartilhar" boolean DEFAULT true NOT NULL,
	"comissao_acordada_tipo" text NOT NULL,
	"comissao_acordada_valor" double precision NOT NULL,
	"comissao_acordada_moeda" text,
	"criada_por" text NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indicacoes_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "codigos_emitidos" (
	"codigo" text PRIMARY KEY NOT NULL,
	"emitido_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acessos" (
	"id" text PRIMARY KEY NOT NULL,
	"indicacao_id" text NOT NULL,
	"em" timestamp with time zone DEFAULT now() NOT NULL,
	"visitante_id" text NOT NULL,
	"cidade" text NOT NULL,
	"uf" text NOT NULL,
	"aparelho" text NOT NULL,
	"origem" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"papel" text NOT NULL,
	"perfil" text DEFAULT 'administrador' NOT NULL,
	"acessos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"parceiro_id" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"convite_pendente" boolean DEFAULT false NOT NULL,
	"convite_token" text,
	"convite_expira_em" timestamp with time zone,
	"ultimo_acesso" timestamp with time zone,
	"telefone" text,
	"localidade" text,
	"avatar_url" text,
	"tentativas_falhas" integer DEFAULT 0 NOT NULL,
	"bloqueado_ate" timestamp with time zone,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email"),
	CONSTRAINT "usuarios_convite_token_unique" UNIQUE("convite_token")
);
--> statement-breakpoint
CREATE TABLE "recuperacoes_senha" (
	"token" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parceiros" ADD CONSTRAINT "parceiros_especialidade_id_especialidades_id_fk" FOREIGN KEY ("especialidade_id") REFERENCES "public"."especialidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicacoes" ADD CONSTRAINT "indicacoes_parceiro_id_parceiros_id_fk" FOREIGN KEY ("parceiro_id") REFERENCES "public"."parceiros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acessos" ADD CONSTRAINT "acessos_indicacao_id_indicacoes_id_fk" FOREIGN KEY ("indicacao_id") REFERENCES "public"."indicacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_parceiro_id_parceiros_id_fk" FOREIGN KEY ("parceiro_id") REFERENCES "public"."parceiros"("id") ON DELETE cascade ON UPDATE no action;
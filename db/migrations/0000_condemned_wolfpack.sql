CREATE TABLE "pessoas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matricula" text NOT NULL,
	"nome" text NOT NULL,
	"funcao" text,
	"filial_id" uuid,
	"regional" text,
	"is_colaborador" boolean DEFAULT true NOT NULL,
	"is_gestor" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pessoas_matricula_unique" UNIQUE("matricula")
);
--> statement-breakpoint
CREATE TABLE "competencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"ordem" integer DEFAULT 0 NOT NULL,
	"peso" numeric(4, 2) DEFAULT '1' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competencias_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "fatores_avaliacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competencia_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"texto" text NOT NULL,
	"escala_max" integer DEFAULT 5 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avaliacoes_desempenho" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filial_id" uuid NOT NULL,
	"avaliado_id" uuid NOT NULL,
	"gestor_id" uuid NOT NULL,
	"data_avaliacao" date DEFAULT current_date NOT NULL,
	"pontuacao_final" numeric(4, 2),
	"classificacao" text,
	"pontos_fortes" text,
	"oportunidades" text,
	"comentarios" text,
	"plano_desenvolvimento" text,
	"criada_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avaliacoes_detalhes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"avaliacao_id" uuid NOT NULL,
	"fator_id" uuid NOT NULL,
	"competencia_id" uuid NOT NULL,
	"nota" integer NOT NULL,
	CONSTRAINT "avaliacoes_detalhes_nota_check" CHECK (nota BETWEEN 1 AND 5)
);
--> statement-breakpoint
ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_filial_id_filiais_id_fk" FOREIGN KEY ("filial_id") REFERENCES "public"."filiais"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatores_avaliacao" ADD CONSTRAINT "fatores_avaliacao_competencia_id_competencias_id_fk" FOREIGN KEY ("competencia_id") REFERENCES "public"."competencias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_desempenho" ADD CONSTRAINT "avaliacoes_desempenho_filial_id_filiais_id_fk" FOREIGN KEY ("filial_id") REFERENCES "public"."filiais"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_desempenho" ADD CONSTRAINT "avaliacoes_desempenho_avaliado_id_pessoas_id_fk" FOREIGN KEY ("avaliado_id") REFERENCES "public"."pessoas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_desempenho" ADD CONSTRAINT "avaliacoes_desempenho_gestor_id_pessoas_id_fk" FOREIGN KEY ("gestor_id") REFERENCES "public"."pessoas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_detalhes" ADD CONSTRAINT "avaliacoes_detalhes_avaliacao_id_avaliacoes_desempenho_id_fk" FOREIGN KEY ("avaliacao_id") REFERENCES "public"."avaliacoes_desempenho"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_detalhes" ADD CONSTRAINT "avaliacoes_detalhes_fator_id_fatores_avaliacao_id_fk" FOREIGN KEY ("fator_id") REFERENCES "public"."fatores_avaliacao"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_detalhes" ADD CONSTRAINT "avaliacoes_detalhes_competencia_id_competencias_id_fk" FOREIGN KEY ("competencia_id") REFERENCES "public"."competencias"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pessoas_filial_idx" ON "pessoas" USING btree ("filial_id");--> statement-breakpoint
CREATE INDEX "pessoas_matricula_idx" ON "pessoas" USING btree ("matricula");--> statement-breakpoint
CREATE INDEX "fatores_competencia_ordem_idx" ON "fatores_avaliacao" USING btree ("competencia_id","ordem");--> statement-breakpoint
CREATE INDEX "avaliacoes_desempenho_filial_data_idx" ON "avaliacoes_desempenho" USING btree ("filial_id","data_avaliacao");--> statement-breakpoint
CREATE INDEX "avaliacoes_desempenho_avaliado_data_idx" ON "avaliacoes_desempenho" USING btree ("avaliado_id","data_avaliacao");--> statement-breakpoint
CREATE UNIQUE INDEX "avaliacoes_desempenho_uniq_dia" ON "avaliacoes_desempenho" USING btree ("avaliado_id","gestor_id","data_avaliacao");--> statement-breakpoint
CREATE INDEX "avaliacoes_detalhes_avaliacao_idx" ON "avaliacoes_detalhes" USING btree ("avaliacao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "avaliacoes_detalhes_uniq_fator" ON "avaliacoes_detalhes" USING btree ("avaliacao_id","fator_id");
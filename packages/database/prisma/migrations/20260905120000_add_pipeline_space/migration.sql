ALTER TABLE "Pipeline" ADD COLUMN "space" TEXT NOT NULL DEFAULT 'COMMERCIAL';

CREATE INDEX "Pipeline_organizationId_space_deletedAt_archived_position_idx"
ON "Pipeline"("organizationId", "space", "deletedAt", "archived", "position");

WITH templates(name, description, color, icon, position) AS (
  VALUES
    ('Pós-venda', 'Relacionamento, satisfação e acompanhamento após a entrega.', '#10B981', 'relationship', 0),
    ('Garantia e assistência', 'Análise de defeitos, avarias e solicitações de assistência.', '#F59E0B', 'support', 1),
    ('Trocas e devoluções', 'Solicitação, análise, coleta, reenvio e conclusão.', '#3B82F6', 'refresh', 2),
    ('Reembolsos', 'Solicitação, aprovação e confirmação financeira.', '#EC4899', 'portfolio', 3)
)
INSERT INTO "Pipeline" ("id", "organizationId", "name", "description", "color", "icon", "space", "position", "accessMode", "createdAt", "updatedAt")
SELECT 'att_' || substr(md5(o."id" || t.name), 1, 20), o."id", t.name, t.description, t.color, t.icon, 'ATTENDANCE', t.position, 'ORGANIZATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organization" o CROSS JOIN templates t
WHERE NOT EXISTS (SELECT 1 FROM "Pipeline" p WHERE p."organizationId" = o."id" AND p."space" = 'ATTENDANCE' AND lower(p."name") = lower(t.name) AND p."deletedAt" IS NULL);

WITH stage_templates(pipeline_name, stage_name, color, position, initial_stage) AS (
  VALUES
    ('Pós-venda','Novo atendimento','#8B5CF6',0,true), ('Pós-venda','Primeiro contato','#3B82F6',1,false), ('Pós-venda','Aguardando cliente','#F59E0B',2,false), ('Pós-venda','Acompanhamento','#06B6D4',3,false), ('Pós-venda','Concluído','#10B981',4,false),
    ('Garantia e assistência','Solicitação recebida','#8B5CF6',0,true), ('Garantia e assistência','Aguardando documentos','#F59E0B',1,false), ('Garantia e assistência','Em análise','#3B82F6',2,false), ('Garantia e assistência','Solução aprovada','#06B6D4',3,false), ('Garantia e assistência','Concluído','#10B981',4,false),
    ('Trocas e devoluções','Solicitação recebida','#8B5CF6',0,true), ('Trocas e devoluções','Em análise','#3B82F6',1,false), ('Trocas e devoluções','Aguardando devolução','#F59E0B',2,false), ('Trocas e devoluções','Reenvio ou troca','#06B6D4',3,false), ('Trocas e devoluções','Concluído','#10B981',4,false),
    ('Reembolsos','Solicitação recebida','#8B5CF6',0,true), ('Reembolsos','Em análise','#3B82F6',1,false), ('Reembolsos','Processando reembolso','#F59E0B',2,false), ('Reembolsos','Reembolsado','#10B981',3,false), ('Reembolsos','Recusado','#EF4444',4,false)
)
INSERT INTO "PipelineStage" ("id", "organizationId", "pipelineId", "name", "color", "position", "isInitial", "createdAt", "updatedAt")
SELECT 'ats_' || substr(md5(p."id" || s.stage_name), 1, 20), p."organizationId", p."id", s.stage_name, s.color, s.position, s.initial_stage, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Pipeline" p JOIN stage_templates s ON s.pipeline_name = p."name"
WHERE p."space" = 'ATTENDANCE' AND NOT EXISTS (SELECT 1 FROM "PipelineStage" ps WHERE ps."pipelineId" = p."id" AND lower(ps."name") = lower(s.stage_name) AND ps."deletedAt" IS NULL);

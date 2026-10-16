-- Aceita tanto bancos onde a remoção antiga foi aplicada quanto bancos que
-- preservaram birthDate. Não recria tabelas nem preenche datas artificialmente.
SET @webkore_birth_date_sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'User' AND column_name = 'birthDate') > 0,
  'ALTER TABLE `User` MODIFY COLUMN `birthDate` DATE NULL',
  'ALTER TABLE `User` ADD COLUMN `birthDate` DATE NULL'
);
PREPARE webkore_birth_date_statement FROM @webkore_birth_date_sql;
EXECUTE webkore_birth_date_statement;
DEALLOCATE PREPARE webkore_birth_date_statement;

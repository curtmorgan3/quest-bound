-- AlterTable
ALTER TABLE "_PublishedRulesetModules" ADD CONSTRAINT "_PublishedRulesetModules_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_PublishedRulesetModules_AB_unique";

-- AlterTable
ALTER TABLE "_RulesetModules" ADD CONSTRAINT "_RulesetModules_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_RulesetModules_AB_unique";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Checkbox,
  DescriptionEditor,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ImageUpload,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components';
import {
  RulesetColorPicker,
  type RulesetColorPickerValue,
} from '@/components/composites/ruleset-color-picker';
import { ExportRulesetModal } from '@/components/export-ruleset-modal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/use-notifications';
import { isCloudConfigured } from '@/lib/cloud/client';
import {
  fetchOrganizationAsAdmin,
  formatOrgSaveError,
  linkRulesetToOrganization,
  listAllLinkedRulesetIds,
  listOrganizationRulesetLinks,
  listOwnCloudRulesetSummaries,
  unlinkRulesetFromOrganization,
  type OrganizationRow,
} from '@/lib/cloud/organizations/org-api';
import { useExportRuleset, useFonts, useImportRuleset, useRulesets } from '@/lib/compass-api';
import { addModuleFromZip } from '@/lib/compass-api/hooks/export/add-module-from-zip';
import { addModuleToRuleset } from '@/lib/compass-api/hooks/export/add-module-to-ruleset';
import {
  getDanglingReferencesForModuleRemoval,
  removeModuleFromRuleset,
} from '@/lib/compass-api/hooks/export/remove-module-from-ruleset';
import { useCloudAuthStore } from '@/stores';
import type { Ruleset, RulesetModuleEntry } from '@/types';
import { rgbToHex } from '@/utils';
import {
  Building2,
  Download,
  FileText,
  Loader2,
  Package,
  Plus,
  Sliders,
  Trash,
  Unlink,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

interface RulesetSettingsProps {
  activeRuleset: Ruleset;
}

export const RulesetSettings = ({ activeRuleset }: RulesetSettingsProps) => {
  const { updateRuleset, rulesets, resetTestCharacter } = useRulesets();
  const { exportRuleset, exportableCharacters, campaigns, isExporting } = useExportRuleset(
    activeRuleset.id,
  );
  const { importRuleset } = useImportRuleset();
  const { fonts, createFont, deleteFont } = useFonts(activeRuleset.id);
  const { addNotification } = useNotifications();
  const [addingModule, setAddingModule] = useState(false);
  const [addingModuleFromFile, setAddingModuleFromFile] = useState(false);
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const addFromFileInputRef = useRef<HTMLInputElement>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [moduleToRemove, setModuleToRemove] = useState<RulesetModuleEntry | null>(null);
  const [danglingRefs, setDanglingRefs] = useState<{
    components: number;
    scripts: number;
    charts: number;
    documents: number;
    windows: number;
    attributes: number;
    actions: number;
    items: number;
  } | null>(null);
  const [removingModule, setRemovingModule] = useState(false);
  const [resettingTestValues, setResettingTestValues] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<Record<
    string,
    Array<{ id: string; title?: string }>
  > | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const cloudUser = useCloudAuthStore((s) => s.cloudUser);
  const touchCloudRulesetList = useCloudAuthStore((s) => s.touchCloudRulesetList);
  const cloudRulesetListEpoch = useCloudAuthStore((s) => s.cloudRulesetListEpoch);
  const cloudUserId = cloudUser?.id;

  const [orgAsAdmin, setOrgAsAdmin] = useState<OrganizationRow | null>(null);
  const [orgRulesetLinkBusy, setOrgRulesetLinkBusy] = useState(false);
  const [linkedRulesetIdsForMyOrg, setLinkedRulesetIdsForMyOrg] = useState<Set<string>>(
    () => new Set(),
  );
  const [ownedCloudRulesetIds, setOwnedCloudRulesetIds] = useState<Set<string>>(() => new Set());
  const [globallyLinkedRulesetIds, setGloballyLinkedRulesetIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    let cancelled = false;
    if (!isCloudConfigured || !cloudUserId) {
      setOrgAsAdmin(null);
      setLinkedRulesetIdsForMyOrg(new Set());
      setOwnedCloudRulesetIds(new Set());
      setGloballyLinkedRulesetIds(new Set());
      return;
    }

    void (async () => {
      try {
        const org = await fetchOrganizationAsAdmin(cloudUserId);
        if (cancelled) return;
        setOrgAsAdmin(org);
        if (!org) {
          setLinkedRulesetIdsForMyOrg(new Set());
          setOwnedCloudRulesetIds(new Set());
          setGloballyLinkedRulesetIds(new Set());
          return;
        }
        const [links, owned, globalLinked] = await Promise.all([
          listOrganizationRulesetLinks(org.id),
          listOwnCloudRulesetSummaries(cloudUserId),
          listAllLinkedRulesetIds(),
        ]);
        if (cancelled) return;
        setLinkedRulesetIdsForMyOrg(new Set(links.map((l) => l.ruleset_id)));
        setOwnedCloudRulesetIds(new Set(owned.map((r) => r.id)));
        setGloballyLinkedRulesetIds(new Set(globalLinked));
      } catch {
        if (!cancelled) {
          setOrgAsAdmin(null);
          setLinkedRulesetIdsForMyOrg(new Set());
          setOwnedCloudRulesetIds(new Set());
          setGloballyLinkedRulesetIds(new Set());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cloudUserId, cloudRulesetListEpoch]);

  const isRulesetLinkedToMyOrg = linkedRulesetIdsForMyOrg.has(activeRuleset.id);
  const canLinkRulesetToMyOrg =
    ownedCloudRulesetIds.has(activeRuleset.id) && !globallyLinkedRulesetIds.has(activeRuleset.id);
  const showOrgRulesetLinkControls =
    Boolean(orgAsAdmin) && (isRulesetLinkedToMyOrg || canLinkRulesetToMyOrg);

  const handleLinkRulesetToOrganization = useCallback(async () => {
    if (!orgAsAdmin || !cloudUserId || !canLinkRulesetToMyOrg) return;
    setOrgRulesetLinkBusy(true);
    try {
      await linkRulesetToOrganization(orgAsAdmin.id, activeRuleset.id, cloudUserId);
      const [links, globalLinked] = await Promise.all([
        listOrganizationRulesetLinks(orgAsAdmin.id),
        listAllLinkedRulesetIds(),
      ]);
      setLinkedRulesetIdsForMyOrg(new Set(links.map((l) => l.ruleset_id)));
      setGloballyLinkedRulesetIds(new Set(globalLinked));
      touchCloudRulesetList();
      addNotification('Ruleset linked to your organization.', { type: 'success' });
    } catch (e) {
      addNotification(formatOrgSaveError(e), { type: 'error' });
    } finally {
      setOrgRulesetLinkBusy(false);
    }
  }, [
    orgAsAdmin,
    cloudUserId,
    canLinkRulesetToMyOrg,
    activeRuleset.id,
    touchCloudRulesetList,
    addNotification,
  ]);

  const handleUnlinkRulesetFromOrganization = useCallback(async () => {
    if (!orgAsAdmin || !isRulesetLinkedToMyOrg) return;
    setOrgRulesetLinkBusy(true);
    try {
      await unlinkRulesetFromOrganization(orgAsAdmin.id, activeRuleset.id);
      const [links, globalLinked] = await Promise.all([
        listOrganizationRulesetLinks(orgAsAdmin.id),
        listAllLinkedRulesetIds(),
      ]);
      setLinkedRulesetIdsForMyOrg(new Set(links.map((l) => l.ruleset_id)));
      setGloballyLinkedRulesetIds(new Set(globalLinked));
      touchCloudRulesetList();
      addNotification('Ruleset unlinked from your organization.', { type: 'success' });
    } catch (e) {
      addNotification(formatOrgSaveError(e), { type: 'error' });
    } finally {
      setOrgRulesetLinkBusy(false);
    }
  }, [
    orgAsAdmin,
    isRulesetLinkedToMyOrg,
    activeRuleset.id,
    touchCloudRulesetList,
    addNotification,
  ]);

  const [title, setTitle] = useState(activeRuleset.title);
  const [version, setVersion] = useState(activeRuleset.version);
  const [description, setDescription] = useState(activeRuleset.description);
  const [characterCtaTitle, setCharacterCtaTitle] = useState(activeRuleset.characterCtaTitle ?? '');
  const [characterCtaDescription, setCharacterCtaDescription] = useState(
    activeRuleset.characterCtaDescription ?? '',
  );
  const [campaignsCtaTitle, setCampaignsCtaTitle] = useState(activeRuleset.campaignsCtaTitle ?? '');
  const [campaignCtaDescription, setCampaignCtaDescription] = useState(
    activeRuleset.campaignCtaDescription ?? '',
  );

  const [fontLoading, setFontLoading] = useState(false);
  const [paletteAddColor, setPaletteAddColor] = useState<string | undefined>(undefined);
  const fontInputRef = useRef<HTMLInputElement>(null);

  const palette = activeRuleset.palette ?? [];

  const handleUpdateTitle = async () => {
    await updateRuleset(activeRuleset.id, { title });
  };

  const handleUpdateVersion = async () => {
    await updateRuleset(activeRuleset.id, { version });
  };

  const handleUpdateDescription = async () => {
    await updateRuleset(activeRuleset.id, { description });
  };

  useEffect(() => {
    if (title === activeRuleset.title) return;
    const timeout = setTimeout(() => {
      handleUpdateTitle();
    }, 500);
    return () => clearTimeout(timeout);
  }, [title]);

  useEffect(() => {
    if (version === activeRuleset.version) return;
    const timeout = setTimeout(() => {
      handleUpdateVersion();
    }, 500);
    return () => clearTimeout(timeout);
  }, [version]);

  useEffect(() => {
    if (description === activeRuleset.description) return;
    const timeout = setTimeout(() => {
      handleUpdateDescription();
    }, 500);
    return () => clearTimeout(timeout);
  }, [description]);

  useEffect(() => {
    setCharacterCtaTitle(activeRuleset.characterCtaTitle ?? '');
    setCharacterCtaDescription(activeRuleset.characterCtaDescription ?? '');
    setCampaignsCtaTitle(activeRuleset.campaignsCtaTitle ?? '');
    setCampaignCtaDescription(activeRuleset.campaignCtaDescription ?? '');
  }, [activeRuleset.id]);

  const handleUpdateCharacterCtaText = async (updates: {
    characterCtaTitle?: string;
    characterCtaDescription?: string;
  }) => {
    await updateRuleset(activeRuleset.id, updates);
  };

  const handleUpdateCampaignsCtaText = async (updates: {
    campaignsCtaTitle?: string;
    campaignCtaDescription?: string;
  }) => {
    await updateRuleset(activeRuleset.id, updates);
  };

  useEffect(() => {
    if (
      characterCtaTitle === (activeRuleset.characterCtaTitle ?? '') &&
      characterCtaDescription === (activeRuleset.characterCtaDescription ?? '')
    )
      return;
    const timeout = setTimeout(() => {
      handleUpdateCharacterCtaText({ characterCtaTitle, characterCtaDescription });
    }, 500);
    return () => clearTimeout(timeout);
  }, [characterCtaTitle, characterCtaDescription]);

  useEffect(() => {
    if (
      campaignsCtaTitle === (activeRuleset.campaignsCtaTitle ?? '') &&
      campaignCtaDescription === (activeRuleset.campaignCtaDescription ?? '')
    )
      return;
    const timeout = setTimeout(() => {
      handleUpdateCampaignsCtaText({ campaignsCtaTitle, campaignCtaDescription });
    }, 500);
    return () => clearTimeout(timeout);
  }, [campaignsCtaTitle, campaignCtaDescription]);

  const handleAddPaletteColor = (value: RulesetColorPickerValue) => {
    if (typeof value === 'string') return;
    const hex = rgbToHex(value.r, value.g, value.b);
    setPaletteAddColor(hex);
  };

  const handleConfirmAddPaletteColor = async () => {
    if (!paletteAddColor) return;
    const next = [...palette, paletteAddColor];
    await updateRuleset(activeRuleset.id, { palette: next });
    setPaletteAddColor(undefined);
  };

  const handleRemovePaletteColor = async (index: number) => {
    const next = palette.filter((_, i) => i !== index);
    await updateRuleset(activeRuleset.id, { palette: next });
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFontLoading(true);
      try {
        await createFont(file);
      } catch (error) {
        console.error('Failed to upload font:', error);
      } finally {
        setFontLoading(false);
        if (fontInputRef.current) {
          fontInputRef.current.value = '';
        }
      }
    }
  };

  const modules = activeRuleset.modules ?? [];
  const availableModuleRulesets = rulesets.filter(
    (r) => r.isModule === true && r.id !== activeRuleset.id,
  );

  const handleAddModule = async (sourceRulesetId: string) => {
    setAddingModule(true);
    try {
      const result = await addModuleToRuleset({
        sourceRulesetId,
        targetRulesetId: activeRuleset.id,
      });
      setAddModuleOpen(false);
      const totalSkipped = Object.values(result.skippedByConflict).reduce((a, b) => a + b, 0);
      if (totalSkipped > 0) {
        setConflictDetails(result.skippedDetails ?? null);
        setConflictDialogOpen(true);
        addNotification('Module added. Some content was skipped due to ID conflicts.', {
          type: 'info',
        });
      } else {
        addNotification('Module added successfully.', { type: 'success' });
      }
    } catch (e) {
      addNotification((e as Error).message, { type: 'error' });
    } finally {
      setAddingModule(false);
    }
  };

  const handleIsModuleChange = async (checked: boolean) => {
    await updateRuleset(activeRuleset.id, { isModule: checked });
  };

  const handleRemoveModuleClick = async (mod: RulesetModuleEntry) => {
    setModuleToRemove(mod);
    try {
      const refs = await getDanglingReferencesForModuleRemoval(activeRuleset.id, mod.id);
      setDanglingRefs(refs);
    } catch {
      setDanglingRefs(null);
    }
    setRemoveDialogOpen(true);
  };

  const handleAddModuleFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddingModuleFromFile(true);
    try {
      const result = await addModuleFromZip({
        file,
        targetRulesetId: activeRuleset.id,
        importRuleset: (f, opts) => importRuleset(f, opts),
      });

      const totalSkipped = Object.values(result.skippedByConflict).reduce((a, b) => a + b, 0);
      if (totalSkipped > 0) {
        setConflictDetails(result.skippedDetails ?? null);
        setConflictDialogOpen(true);
        addNotification('Module added from file. Some content was skipped due to ID conflicts.', {
          type: 'info',
        });
      } else {
        addNotification('Module added from file successfully.', { type: 'success' });
      }
    } catch (err) {
      addNotification((err as Error).message, { type: 'error' });
    } finally {
      setAddingModuleFromFile(false);
      if (addFromFileInputRef.current) addFromFileInputRef.current.value = '';
    }
  };

  const handleConfirmRemoveModule = async () => {
    if (!moduleToRemove) return;
    setRemovingModule(true);
    try {
      await removeModuleFromRuleset({
        targetRulesetId: activeRuleset.id,
        moduleIdToRemove: moduleToRemove.id,
        force: true,
      });
      setRemoveDialogOpen(false);
      setModuleToRemove(null);
      setDanglingRefs(null);
      addNotification(`Module "${moduleToRemove.name}" removed.`, { type: 'success' });
    } catch (e) {
      addNotification((e as Error).message, { type: 'error' });
    } finally {
      setRemovingModule(false);
    }
  };

  return (
    <Tabs defaultValue='details' className='flex min-h-0 flex-1 flex-col gap-4'>
      <TabsList className='w-full max-w-md grid grid-cols-3'>
        <TabsTrigger value='details' className='gap-2'>
          <FileText className='size-4' />
          Details
        </TabsTrigger>
        <TabsTrigger value='defaults' className='gap-2'>
          <Sliders className='size-4' />
          Content
        </TabsTrigger>
        <TabsTrigger value='modules' className='gap-2'>
          <Package className='size-4' />
          Modules
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value='details'
        className='mt-0 flex min-h-0 flex-1 flex-col gap-6 overflow-auto'>
        <div className='flex flex-wrap items-end gap-4'>
          <div className='flex flex-col gap-2 max-w-sm flex-1'>
            <Label htmlFor='ruleset-title'>Title</Label>
            <Input id='ruleset-title' value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className='flex flex-col gap-2 w-32'>
            <Label htmlFor='ruleset-version'>Version</Label>
            <Input
              id='ruleset-version'
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder='1.0.0'
            />
          </div>

          <Button
            className='gap-2 w-[120px]'
            variant='outline'
            onClick={() => setExportModalOpen(true)}>
            <>
              Download
              <Download className='h-4 w-4' />
            </>
          </Button>
          {showOrgRulesetLinkControls ? (
            isRulesetLinkedToMyOrg ? (
              <Button
                type='button'
                className='gap-2 shrink-0'
                variant='outline'
                disabled={orgRulesetLinkBusy}
                onClick={() => void handleUnlinkRulesetFromOrganization()}>
                {orgRulesetLinkBusy ? (
                  <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                ) : (
                  <Unlink className='h-4 w-4' aria-hidden />
                )}
                Unlink Organization
              </Button>
            ) : (
              <Button
                type='button'
                className='gap-2 shrink-0'
                variant='outline'
                disabled={orgRulesetLinkBusy}
                onClick={() => void handleLinkRulesetToOrganization()}>
                {orgRulesetLinkBusy ? (
                  <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                ) : (
                  <Building2 className='h-4 w-4' aria-hidden />
                )}
                Link to Organization
              </Button>
            )
          ) : null}
          <ExportRulesetModal
            open={exportModalOpen}
            onOpenChange={setExportModalOpen}
            characters={exportableCharacters}
            campaigns={campaigns}
            isExporting={isExporting}
            onExport={async (options) => {
              await exportRuleset(options);
            }}
          />
        </div>

        <div className='flex w-full justify-between gap-8'>
          <ImageUpload
            image={activeRuleset.image}
            alt={activeRuleset.title}
            onRemove={() => updateRuleset(activeRuleset.id, { assetId: null })}
            onUpload={(assetId) => updateRuleset(activeRuleset.id, { assetId })}
            rulesetId={activeRuleset.id}
          />

          <DescriptionEditor className='flex-1' value={description} onChange={setDescription} />
        </div>

        <div className='flex flex-col gap-3'>
          <Label>Landing page CTA card images</Label>
          <p className='text-sm text-muted-foreground'>
            Images and copy shown on the Characters and Campaigns cards on the ruleset landing page.
          </p>
          <div className='flex flex-col gap-6'>
            <div className='flex items-start gap-4'>
              <div className='flex flex-col gap-2 shrink-0'>
                <Label className='text-xs font-normal text-muted-foreground'>Characters CTA</Label>
                <ImageUpload
                  image={activeRuleset.charactersCtaImage ?? undefined}
                  alt='Characters CTA'
                  onRemove={() => updateRuleset(activeRuleset.id, { charactersCtaAssetId: null })}
                  onUpload={(assetId) =>
                    updateRuleset(activeRuleset.id, { charactersCtaAssetId: assetId })
                  }
                  rulesetId={activeRuleset.id}
                />
              </div>
              <div className='flex flex-1 flex-row gap-4 min-w-0 items-end'>
                <div className='flex flex-1 flex-col gap-2 min-w-0'>
                  <Label
                    htmlFor='character-cta-title'
                    className='text-xs font-normal text-muted-foreground'>
                    Title
                  </Label>
                  <Input
                    id='character-cta-title'
                    value={characterCtaTitle}
                    onChange={(e) => setCharacterCtaTitle(e.target.value)}
                    placeholder='Characters card title'
                  />
                </div>
                <div className='flex flex-1 flex-col gap-2 min-w-0'>
                  <Label
                    htmlFor='character-cta-description'
                    className='text-xs font-normal text-muted-foreground'>
                    Description
                  </Label>
                  <Input
                    id='character-cta-description'
                    value={characterCtaDescription}
                    onChange={(e) => setCharacterCtaDescription(e.target.value)}
                    placeholder='Characters card description'
                  />
                </div>
              </div>
            </div>
            <div className='flex items-start gap-4'>
              <div className='flex flex-col gap-2 shrink-0'>
                <Label className='text-xs font-normal text-muted-foreground'>Campaigns CTA</Label>
                <ImageUpload
                  image={activeRuleset.campaignsCtaImage ?? undefined}
                  alt='Campaigns CTA'
                  onRemove={() => updateRuleset(activeRuleset.id, { campaignsCtaAssetId: null })}
                  onUpload={(assetId) =>
                    updateRuleset(activeRuleset.id, { campaignsCtaAssetId: assetId })
                  }
                  rulesetId={activeRuleset.id}
                />
              </div>
              <div className='flex flex-1 flex-row gap-4 min-w-0 items-end'>
                <div className='flex flex-1 flex-col gap-2 min-w-0'>
                  <Label
                    htmlFor='campaigns-cta-title'
                    className='text-xs font-normal text-muted-foreground'>
                    Title
                  </Label>
                  <Input
                    id='campaigns-cta-title'
                    value={campaignsCtaTitle}
                    onChange={(e) => setCampaignsCtaTitle(e.target.value)}
                    placeholder='Campaigns card title'
                  />
                </div>
                <div className='flex flex-1 flex-col gap-2 min-w-0'>
                  <Label
                    htmlFor='campaigns-cta-description'
                    className='text-xs font-normal text-muted-foreground'>
                    Description
                  </Label>
                  <Input
                    id='campaigns-cta-description'
                    value={campaignCtaDescription}
                    onChange={(e) => setCampaignCtaDescription(e.target.value)}
                    placeholder='Campaigns card description'
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent
        value='defaults'
        className='mt-0 flex min-h-0 flex-1 flex-col gap-6 overflow-auto'>
        <div className='flex flex-col gap-3'>
          <Label>Custom Properties</Label>
          <p className='text-sm text-muted-foreground'>
            Define custom properties that can be applied to Archetypes and Items
          </p>
          <Button variant='outline' size='sm' className='gap-2 w-fit' asChild>
            <Link to={`/rulesets/${activeRuleset.id}/custom-properties`}>
              <Sliders className='h-4 w-4' />
              Manage Custom Properties
            </Link>
          </Button>
        </div>
        <div className='flex flex-col gap-3'>
          <Label>Fonts</Label>
          <div className='flex flex-col gap-2'>
            {fonts.map((font) => (
              <div
                key={font.id}
                className='flex items-center justify-between bg-muted px-3 py-2 rounded-md'>
                <span className='text-sm'>{font.label}</span>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => deleteFont(font.id)}
                  className='h-8 w-8 p-0'>
                  <Trash className='h-4 w-4 text-destructive' />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant='outline'
            className='gap-2 w-fit'
            disabled={fontLoading}
            onClick={() => fontInputRef.current?.click()}>
            <Upload className='h-4 w-4' />
            {fontLoading ? 'Uploading...' : 'Upload Font'}
          </Button>
          <input
            ref={fontInputRef}
            type='file'
            accept='.ttf,.otf,.woff,.woff2'
            className='hidden'
            onChange={handleFontUpload}
          />
        </div>

        <div className='flex flex-col gap-3'>
          <Label>Palette</Label>
          <div className='flex flex-col gap-4'>
            <div className='flex flex-wrap items-center gap-2'>
              {palette.map((color, index) => (
                <div
                  key={`${color}-${index}`}
                  className='group flex items-center gap-0.5 rounded-md border border-border overflow-hidden bg-muted'>
                  <div
                    className='h-8 w-8 shrink-0 border-r border-border'
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleRemovePaletteColor(index)}
                    className='h-8 w-6 p-0 opacity-70 hover:opacity-100'
                    aria-label={`Remove ${color}`}>
                    <Trash className='h-3.5 w-3.5 text-destructive' />
                  </Button>
                </div>
              ))}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant='outline' size='sm' className='gap-2 h-8 w-[50px]'>
                  <Plus className='h-4 w-4' />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0 border-0' align='start'>
                <div className='p-2'>
                  <RulesetColorPicker
                    color={paletteAddColor}
                    disableAlpha
                    onUpdate={handleAddPaletteColor}
                  />
                  <Button
                    className='w-full mt-2'
                    size='sm'
                    disabled={!paletteAddColor}
                    onClick={handleConfirmAddPaletteColor}>
                    Add to palette
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className='flex flex-col gap-3'>
          <p className='text-sm text-muted-foreground'>
            Reset the attribute values stored when testing this ruleset to their defaults.
          </p>
          <Button
            variant='outline'
            size='sm'
            className='gap-2 w-fit'
            disabled={resettingTestValues}
            onClick={async () => {
              setResettingTestValues(true);
              try {
                await resetTestCharacter(activeRuleset.id);
                addNotification('Test values reset.', { type: 'success' });
              } catch (e) {
                addNotification((e as Error).message, { type: 'error' });
              } finally {
                setResettingTestValues(false);
              }
            }}>
            {resettingTestValues ? 'Resetting...' : 'Reset Test Values'}
          </Button>
        </div>
      </TabsContent>

      <TabsContent
        value='modules'
        className='mt-0 flex min-h-0 flex-1 flex-col gap-6 overflow-auto'>
        <div className='flex flex-col gap-3'>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='ruleset-is-module'
              checked={activeRuleset.isModule === true}
              onCheckedChange={(checked) => handleIsModuleChange(checked === true)}
            />
            <Label htmlFor='ruleset-is-module' className='cursor-pointer font-normal'>
              Use as module (allow this ruleset to be added to other rulesets)
            </Label>
          </div>
        </div>

        <div className='flex flex-col gap-3'>
          <Label>Modules</Label>
          <p className='text-sm text-muted-foreground'>
            Add content from another ruleset that is marked as a module.
          </p>
          <div className='flex flex-col gap-2'>
            {modules.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No modules added yet.</p>
            ) : (
              modules.map((mod) => {
                const sourceExists = rulesets.some((r) => r.id === mod.id);
                return (
                  <div
                    key={mod.id}
                    className='flex items-center gap-3 rounded-md border border-border bg-muted/50 px-3 py-2'>
                    {mod.image ? (
                      <img
                        src={mod.image}
                        alt=''
                        className='h-8 w-8 shrink-0 rounded object-cover'
                      />
                    ) : (
                      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted'>
                        <Package className='h-4 w-4 text-muted-foreground' />
                      </div>
                    )}
                    <div className='flex-1 min-w-0'>
                      <span className='text-sm font-medium'>{mod.name}</span>
                      {!sourceExists && (
                        <p className='text-xs text-muted-foreground mt-0.5'>
                          Source no longer available
                        </p>
                      )}
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 w-8 p-0 text-muted-foreground hover:text-destructive'
                      onClick={() => handleRemoveModuleClick(mod)}
                      aria-label={`Remove module ${mod.name}`}>
                      <Trash className='h-4 w-4' />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Popover open={addModuleOpen} onOpenChange={setAddModuleOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-2 w-fit'
                  disabled={addingModule || availableModuleRulesets.length === 0}>
                  <Plus className='h-4 w-4' />
                  {addingModule ? 'Adding...' : 'Add module'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-80 p-0' align='start'>
                <div className='p-2'>
                  <p className='mb-2 text-sm text-muted-foreground'>
                    Choose a ruleset to add as a module:
                  </p>
                  <div className='flex max-h-60 flex-col gap-1 overflow-auto'>
                    {availableModuleRulesets.map((r) => (
                      <Button
                        key={r.id}
                        variant='ghost'
                        size='sm'
                        className='justify-start gap-2'
                        onClick={() => handleAddModule(r.id)}>
                        {r.image ? (
                          <img
                            src={r.image}
                            alt=''
                            className='h-6 w-6 shrink-0 rounded object-cover'
                          />
                        ) : (
                          <Package className='h-4 w-4 shrink-0 text-muted-foreground' />
                        )}
                        {r.title}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant='outline'
              size='sm'
              className='gap-2 w-fit'
              disabled={addingModuleFromFile}
              onClick={() => addFromFileInputRef.current?.click()}>
              <Upload className='h-4 w-4' />
              {addingModuleFromFile ? 'Adding...' : 'Add from file'}
            </Button>
            <input
              ref={addFromFileInputRef}
              type='file'
              accept='.zip'
              className='hidden'
              onChange={handleAddModuleFromFile}
              aria-label='Upload ruleset zip to add as module'
            />
          </div>
        </div>

        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove module?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className='flex flex-col gap-2'>
                  {moduleToRemove && (
                    <span>
                      All content from <strong>{moduleToRemove.name}</strong> will be removed from
                      this ruleset.
                    </span>
                  )}
                  {danglingRefs &&
                    (danglingRefs.components > 0 ||
                      danglingRefs.scripts > 0 ||
                      danglingRefs.charts > 0 ||
                      danglingRefs.documents > 0 ||
                      danglingRefs.windows > 0 ||
                      danglingRefs.attributes > 0 ||
                      danglingRefs.actions > 0 ||
                      danglingRefs.items > 0) && (
                      <span className='text-destructive font-medium'>
                        Some of your ruleset content references this module (e.g. attributes,
                        scripts, components). Those references will break if you remove it.
                      </span>
                    )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setModuleToRemove(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void handleConfirmRemoveModule();
                }}
                disabled={removingModule}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                {removingModule ? 'Removing...' : 'Remove module'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={conflictDialogOpen}
          onOpenChange={(open) => {
            setConflictDialogOpen(open);
            if (!open) setConflictDetails(null);
          }}>
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle>Skipped due to ID conflicts</DialogTitle>
              <DialogDescription>
                The following content from the module was not added because the target ruleset
                already has content with the same ID. You can rename or remove the conflicting
                content in the target, then add the module again to include it.
              </DialogDescription>
            </DialogHeader>
            <div className='max-h-64 overflow-auto rounded-md border border-border bg-muted/30 p-2'>
              {conflictDetails &&
                Object.entries(conflictDetails).map(([entityType, items]) => {
                  if (!items.length) return null;
                  const label =
                    entityType === 'diceRolls'
                      ? 'Dice rolls'
                      : entityType.charAt(0).toUpperCase() + entityType.slice(1);
                  return (
                    <div key={entityType} className='mb-3 last:mb-0'>
                      <p className='text-sm font-medium text-foreground'>
                        {label} ({items.length})
                      </p>
                      <ul className='mt-1 list-inside list-disc text-sm text-muted-foreground'>
                        {items.map((item) => (
                          <li key={item.id}>
                            {item.title ? `${item.title} (${item.id})` : item.id}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
            </div>
            <DialogFooter>
              <Button onClick={() => setConflictDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
};

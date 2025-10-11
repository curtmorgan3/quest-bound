import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAssets, useRulesets } from '@/lib/compass-api';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  Folder,
  FolderPlus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

interface TreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  asset?: any; // The actual asset data
  path: string;
}

interface AssetManagerModalProps {
  children: React.ReactNode;
}

export const AssetManagerModal = ({ children }: AssetManagerModalProps) => {
  const { activeRuleset } = useRulesets();
  const { assets, createAsset, deleteAsset } = useAssets(activeRuleset?.id);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [dragOverNode, setDragOverNode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build directory tree from assets
  const directoryTree = useMemo(() => {
    if (!assets) return [];

    const tree: TreeNode[] = [];
    const folderMap = new Map<string, TreeNode>();

    // First pass: create all folders and files
    assets.forEach((asset) => {
      // Skip folder marker files
      if (asset.filename.startsWith('.folder-')) {
        return;
      }

      const path = asset.directory || '';
      const pathParts = path.split('/').filter(Boolean);

      if (pathParts.length === 0) {
        // File in root directory
        tree.push({
          id: asset.id,
          name: asset.filename,
          type: 'file',
          asset,
          path: asset.filename,
        });
      } else {
        // Build folder structure
        let currentPath = '';
        let currentParent = tree;

        pathParts.forEach((part, index) => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          const isLastPart = index === pathParts.length - 1;

          let folder = folderMap.get(currentPath);
          if (!folder) {
            folder = {
              id: `folder-${currentPath}`,
              name: part,
              type: 'folder',
              children: [],
              path: currentPath,
            };
            folderMap.set(currentPath, folder);
            currentParent.push(folder);
          }

          if (isLastPart) {
            // Add file to this folder
            folder.children!.push({
              id: asset.id,
              name: asset.filename,
              type: 'file',
              asset,
              path: `${currentPath}/${asset.filename}`,
            });
          } else {
            currentParent = folder.children!;
          }
        });
      }
    });

    // Second pass: add empty folders that were created but have no files
    assets.forEach((asset) => {
      if (asset.filename.startsWith('.folder-')) {
        const folderName = asset.filename.replace('.folder-', '');
        const path = asset.directory || '';
        const fullPath = path ? `${path}/${folderName}` : folderName;

        if (!folderMap.has(fullPath)) {
          const pathParts = fullPath.split('/').filter(Boolean);
          let currentPath = '';
          let currentParent = tree;

          pathParts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            const isLastPart = index === pathParts.length - 1;

            let folder = folderMap.get(currentPath);
            if (!folder) {
              folder = {
                id: `folder-${currentPath}`,
                name: part,
                type: 'folder',
                children: [],
                path: currentPath,
              };
              folderMap.set(currentPath, folder);
              currentParent.push(folder);
            }

            if (!isLastPart) {
              currentParent = folder.children!;
            }
          });
        }
      }
    });

    return tree;
  }, [assets]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const selectedFolder =
      selectedNode && selectedNode.startsWith('folder-')
        ? selectedNode.replace('folder-', '')
        : undefined;

    for (const file of Array.from(files)) {
      await createAsset(file, selectedFolder);
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const selectedFolder =
      selectedNode && selectedNode.startsWith('folder-')
        ? selectedNode.replace('folder-', '')
        : undefined;

    // Create a placeholder file to represent the folder in the database
    // This is a simple approach - in production you might want a separate folders table
    const folderContent = '';
    const folderFile: File = new File([folderContent], `.folder-${newFolderName}`, {
      type: 'text/plain',
    });
    await createAsset(folderFile, selectedFolder);

    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleDelete = async (nodeId: string) => {
    if (nodeId.startsWith('folder-')) {
      // Delete all assets in this folder
      const folderPath = nodeId.replace('folder-', '');
      const assetsToDelete = assets.filter(
        (asset) =>
          asset.filename === `.${nodeId}` ||
          asset.directory === folderPath ||
          asset.directory?.startsWith(`${folderPath}/`) ||
          (asset.filename.startsWith('.folder-') && asset.directory === folderPath),
      );

      console.log(assetsToDelete);

      for (const asset of assetsToDelete) {
        await deleteAsset(asset.id);
      }
    } else {
      // Delete single file
      await deleteAsset(nodeId);
    }
  };

  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedNode === node.id;
    const isDragOver = dragOverNode === node.id;

    return (
      <div key={node.id} className='select-none'>
        <div
          className={cn(
            'group flex items-center gap-2 py-1 px-2 rounded hover:bg-muted cursor-pointer',
            isSelected && 'bg-accent',
            isDragOver && 'bg-blue-100',
          )}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => setSelectedNode(node.id)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverNode(node.id);
          }}
          onDragLeave={() => setDragOverNode(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverNode(null);
            // Handle drop logic here
          }}>
          {node.type === 'folder' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.id);
              }}
              className='p-0.5 hover:bg-muted rounded'>
              {isExpanded ? (
                <ChevronDown className='h-4 w-4' />
              ) : (
                <ChevronRight className='h-4 w-4' />
              )}
            </button>
          ) : (
            <div className='w-5' /> // Spacer for alignment
          )}

          {node.type === 'folder' ? (
            <Folder className='h-4 w-4 text-blue-500' />
          ) : (
            <FileIcon className='h-4 w-4 text-gray-500' />
          )}

          <span className='flex-1 text-sm'>{node.name}</span>

          <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground'
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(node.id);
              }}>
              <Trash2 className='h-3 w-3' />
            </Button>
          </div>
        </div>

        {node.type === 'folder' && isExpanded && node.children && (
          <div>{node.children.map((child) => renderTreeNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className=' w-[80vw] h-[80vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Asset Manager</DialogTitle>
          <DialogDescription>
            Manage assets for {activeRuleset?.title || 'this ruleset'}
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 flex gap-4 min-h-0'>
          {/* Directory Tree */}
          <div className='w-1/2 border rounded-lg p-4 overflow-auto'>
            <div className='flex items-center gap-2 mb-4'>
              <Button
                size='sm'
                onClick={() => fileInputRef.current?.click()}
                className='flex items-center gap-2'>
                <Upload className='h-4 w-4' />
                Upload Files
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => setIsCreatingFolder(true)}
                className='flex items-center gap-2'>
                <FolderPlus className='h-4 w-4' />
                New Folder
              </Button>
            </div>

            {isCreatingFolder && (
              <div className='mb-4 p-3 border rounded-lg bg-muted'>
                <Label htmlFor='folder-name'>Folder Name</Label>
                <div className='flex gap-2 mt-2'>
                  <Input
                    id='folder-name'
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder='Enter folder name'
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateFolder();
                      } else if (e.key === 'Escape') {
                        setIsCreatingFolder(false);
                        setNewFolderName('');
                      }
                    }}
                  />
                  <Button size='sm' onClick={handleCreateFolder}>
                    Create
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                    }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className='space-y-1'>{directoryTree.map((node) => renderTreeNode(node))}</div>
          </div>

          {/* Asset Preview/Details */}
          <div className='w-1/2 border rounded-lg p-4'>
            <h3 className='font-medium mb-4'>Asset Details</h3>
            {selectedNode && !selectedNode.startsWith('folder-') ? (
              <div className='space-y-4'>
                {(() => {
                  const asset = assets.find((a) => a.id === selectedNode);
                  if (!asset) return <p>Asset not found</p>;

                  return (
                    <>
                      <div>
                        <h4 className='font-medium text-sm text-muted-foreground'>Filename</h4>
                        <p className='text-sm'>{asset.filename}</p>
                      </div>
                      <div>
                        <h4 className='font-medium text-sm text-muted-foreground'>Type</h4>
                        <p className='text-sm'>{asset.type}</p>
                      </div>
                      <div>
                        <h4 className='font-medium text-sm text-muted-foreground'>Directory</h4>
                        <p className='text-sm'>{asset.directory || 'Root'}</p>
                      </div>
                      <div>
                        <h4 className='font-medium text-sm text-muted-foreground'>Size</h4>
                        <p className='text-sm'>
                          {Math.round((asset.data.length * 0.75) / 1024)} KB (estimated)
                        </p>
                      </div>
                      {asset.type.startsWith('image/') && (
                        <div>
                          <h4 className='font-medium text-sm text-muted-foreground mb-2'>
                            Preview
                          </h4>
                          <img
                            src={asset.data}
                            alt={asset.filename}
                            className='max-w-full max-h-64 object-contain border rounded'
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : selectedNode && selectedNode.startsWith('folder-') ? (
              <div className='space-y-4'>
                <div>
                  <h4 className='font-medium text-sm text-muted-foreground'>Folder Name</h4>
                  <p className='text-sm'>{selectedNode.replace('folder-', '')}</p>
                </div>
                <div>
                  <h4 className='font-medium text-sm text-muted-foreground'>Path</h4>
                  <p className='text-sm'>{selectedNode.replace('folder-', '')}</p>
                </div>
                <div>
                  <h4 className='font-medium text-sm text-muted-foreground'>Contents</h4>
                  <p className='text-sm'>
                    {(() => {
                      const folderPath = selectedNode.replace('folder-', '');
                      const folderAssets = assets.filter(
                        (asset) =>
                          asset.directory === folderPath ||
                          asset.directory?.startsWith(`${folderPath}/`),
                      );
                      return `${folderAssets.length} items`;
                    })()}
                  </p>
                </div>
              </div>
            ) : (
              <p className='text-muted-foreground'>Select an asset to view details</p>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type='file'
          multiple
          className='hidden'
          onChange={handleFileUpload}
        />
      </DialogContent>
    </Dialog>
  );
};

import UploadIcon from '@/assets/upload.svg?react';
import { ClearOutlined, CloseOutlined, UploadOutlined } from '@ant-design/icons';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from '@visu/i18n';
import { BucketContext, getPathType, RenderBlock } from '@visu/kit';
import { Button, List, message, Tooltip, Upload, UploadProps } from 'antd';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { QueryProvider } from '../../api/queriClient';
import styles from './index.module.css';

export const Route = createFileRoute('/local/')({
  component: RouteComponent,
})

interface FileItem {
  id?: number;  // 用于IndexedDB
  name: string;
  content: string;
  type: string;
  lastModified: number;
}

// IndexedDB操作函数
const dbName = 'filesDB';
const storeName = 'files';

// 打开数据库连接
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

// 保存文件到IndexedDB
const saveFile = async (file: FileItem): Promise<number> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(file);
    
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

const deleteAllFiles = async (): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  const request = store.clear();
  
  request.onsuccess = () => Promise.resolve();
  request.onerror = () => Promise.reject(request.error);
  
  transaction.oncomplete = () => db.close();
}

// 从IndexedDB获取所有文件
const getAllFiles = async (): Promise<FileItem[]> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// 从IndexedDB删除文件
const deleteFile = async (id: number): Promise<void> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

function RouteComponent() {
  const { t } = useTranslation();
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  
  // 组件加载时从IndexedDB加载文件
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const files = await getAllFiles();
        setFileList(files);
      } catch (error) {
        console.error('Failed to load files:', error);
        message.error(t('load.error'));
      } finally {
        setLoading(false);
      }
    };
    
    loadFiles();
  }, [t]);

  const readFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      
      const fileItem: FileItem = {
        name: file.name,
        content,
        type: file.type,
        lastModified: file.lastModified
      };
      
      try {
        // 保存到IndexedDB
        const id = await saveFile(fileItem);
        
        // 更新状态
        setFileList(prev => [...prev, { ...fileItem, id }]);
        message.success(`${file.name} ${t('upload.success')}`);
      } catch (error) {
        console.error('Failed to save file:', error);
        message.error(t('save.error'));
      }
    };
    
    reader.onerror = () => {
      message.error(t('upload.error'));
    };
    
    // 判断文件类型并读取
    if (file.type.includes('text') || 
        file.type.includes('json') || 
        file.type.includes('jsonl') || 
        file.name.endsWith('.md') || 
        file.name.endsWith('.csv') ||
        file.name.endsWith('.json') ||
        file.name.endsWith('.jsonl') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.json') ||
        file.name.endsWith('.jsonl')
        ) {
      reader.readAsText(file);
    } else if (file.type.includes('image')) {
      reader.readAsDataURL(file);
    } else {
      // 二进制文件存储为ArrayBuffer
      reader.readAsArrayBuffer(file);
    }
  };
  
  const handleDelete = async (id?: number) => {
    if (id === undefined) return;
    
    try {
      await deleteFile(id);
      setFileList(prev => prev.filter(file => file.id !== id));
      message.success(t('delete.success'));
    } catch (error) {
      console.error('Failed to delete file:', error);
      message.error(t('delete.error'));
    }
  };

  const handleDeleteAll = async () => {
    await deleteAllFiles();
    setFileList([]);
  }

  const props: UploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      readFile(file);
      return false; // 阻止默认上传行为
    },
    onDrop(e) {
      Array.from(e.dataTransfer.files).forEach(file => readFile(file));
    },
  };

  const bucketContextValue = useMemo(() => ({
    path: `http://localhost:3000/local/${selectedFile?.name}`,
    total: 0,
    pageSize: 50,
    pageNo: 1,
    onParamsChange: () => {},
    setTotal: () => {},
    bucketUrl: '',
    downloadUrl: '',
    previewUrl: '',
    mimeTypeUrl: '',
  }), [])

  const dataSource = useMemo(() => {
    if (!selectedFile) return undefined

    let content = selectedFile.content

    if (selectedFile.name.endsWith('.jsonl')) {
      // jsonl 取第一行
      content = content.split('\n')[0]
    }

    return {
      name: selectedFile.name,
      type: getPathType(selectedFile.name) as any,
      content,
      last_modified: selectedFile.lastModified.toString(),
      size: selectedFile.content.length,
      owner: 'local',
      path: `http://localhost:3000/local/${selectedFile.name}`,
    }
  }, [selectedFile])

  console.log('selectedFile', selectedFile)
  
  if (fileList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full flex-1">
        <Upload.Dragger {...props} className={clsx(styles.uploadDragger, 'mb-8')}>
          <div className="flex flex-col items-center justify-center gap-2">
            <UploadIcon className='text-4xl' />
            <p className='text-[20px]'>{t('upload.drag')}</p>
            <p className='text-sm text-gray-500'>{t('upload.recommend')}</p>
          </div>
        </Upload.Dragger>
      </div>
    )
  }
  
  return (
    <QueryProvider>
      <BucketContext.Provider value={bucketContextValue}>
        <div className='flex-1 flex flex-row py-4 gap-4'>
          <div className='min-h-0 overflow-y-auto bg-white rounded-r-lg'>
            <List
              loading={loading}
              size="small"
              className={clsx("w-[260px]", styles.fileList)}
              header={
                <div className="flex justify-between px-4">
                  <span className='font-bold'>文件列表</span>
                  <div className='flex flex-row items-center gap-2'>
                    <Upload {...props}>
                      <Button type='text' size='small' icon={<UploadOutlined />} />
                    </Upload>
                    <Button type='text' size='small' icon={<ClearOutlined />} danger onClick={() => handleDeleteAll()} />
                  </div>
                </div>
              }
              dataSource={fileList}
              renderItem={(item) => (
                <List.Item className={clsx('flex flex-row items-center justify-between !px-4', {
                  'bg-blue-100': selectedFile?.id === item.id,
                })} onClick={() => setSelectedFile(item)}>
                  <List.Item.Meta
                    title={<Tooltip placement='topLeft' title={item.name}>{item.name}</Tooltip>}
                    description={new Date(item.lastModified).toLocaleString()}
                  />
                  <Button type='text' size='small' key="delete" icon={<CloseOutlined />} danger onClick={() => handleDelete(item.id)} />
                </List.Item>
              )}
            />
          </div>
          <div className='flex-1'>
            {
              selectedFile && (
                <RenderBlock 
                  dataSource={dataSource}
                  block={{
                    id: selectedFile.id!.toString(),
                    path: `http://localhost:3000/local/${selectedFile.name}`,
                    pathType: 'txt',
                  }}
                  updateBlock={() => {}}
                />
              )
            }
          </div>
        </div>
      </BucketContext.Provider>
    </QueryProvider>
  )
}

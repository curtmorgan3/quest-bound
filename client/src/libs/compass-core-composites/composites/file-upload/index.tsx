import { getApiEndpoint } from '@/constants';
import { FileResponse } from '@/libs/compass-api';
import { generateId } from '@/libs/compass-web-utils';
import Uppy, { Meta, UploadResult, UppyFile } from '@uppy/core';
import '@uppy/core/dist/style.min.css';
import Dashboard from '@uppy/dashboard';
import '@uppy/dashboard/dist/style.min.css';
import ImageEditor from '@uppy/image-editor';
import '@uppy/image-editor/dist/style.css';
import { Dashboard as DashboardComponent } from '@uppy/react';
import XHR from '@uppy/xhr-upload';
import * as csvParser from 'papaparse';
import { useEffect, useState } from 'react';

interface FileUploadProps {
  bucketName: string;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  maxTotalFileSize?: number;
  maxNumberOfFiles?: number;
  onComplete?: (results: FileResponse[]) => void;
  fileKey?: string;
  convertToJson?: boolean;
  fileToAdd?: File | null;
}

const useUppy = ({
  bucketName,
  fileKey,
  allowedFileTypes,
  maxFileSize = 50 * 1024 * 1024,
  maxTotalFileSize,
  maxNumberOfFiles,
  onComplete,
  convertToJson,
}: FileUploadProps) => {
  const [uppy, setUppy] = useState<Uppy | null>(null);

  const imageUploadUrl = `${getApiEndpoint()}/storage/upload`;

  const getObjectName = (name: string) => (convertToJson ? name.replace(/.csv/g, '.json') : name);

  useEffect(() => {
    const uppy = new Uppy({
      restrictions: {
        allowedFileTypes,
        maxFileSize,
        maxTotalFileSize,
        maxNumberOfFiles,
      },
    })
      .use(Dashboard)
      .use(ImageEditor)
      .use(XHR, { endpoint: imageUploadUrl });

    uppy.on('file-added', (file: UppyFile<Meta, Record<string, never>>) => {
      file.meta = {
        ...file.meta,
        bucketName: bucketName,
        objectName: getObjectName(fileKey ?? `${generateId()}-${file.name}`),
        contentType: convertToJson ? 'application/json' : file.type,
        name: getObjectName(`${generateId()}-${file.name}`),
      };

      if (convertToJson) {
        const data = file.data;
        data.text().then((text) => {
          const { data: parsedData } = csvParser.parse(text);
          file.data = new File([JSON.stringify(parsedData)], file.name ?? '');
        });
      }
    });

    uppy.on('complete', (result: UploadResult<Meta, Record<string, never>>) => {
      onComplete?.(
        (result.successful ?? []).map((file: UppyFile<Meta, Record<string, never>>) => ({
          file: file.data as File,
          fileName: file.name ?? '',
          fileKey: convertToJson
            ? (file.meta.objectName as string).replace(/.csv/g, '.json')
            : (file.meta.objectName as string),
        })),
      );
    });

    setUppy(uppy);
  }, []);

  return {
    uppy,
  };
};

export const FileUpload = (props: FileUploadProps) => {
  const { uppy } = useUppy(props);

  useEffect(() => {
    if (props.fileToAdd) {
      uppy?.addFile({
        name: props.fileToAdd.name,
        type: props.fileToAdd.type,
        data: props.fileToAdd,
      });
    }
  }, [uppy, props.fileToAdd]);

  if (!uppy) {
    return null;
  }

  return <DashboardComponent id='uppy-dashboard' uppy={uppy} theme='dark' />;
};

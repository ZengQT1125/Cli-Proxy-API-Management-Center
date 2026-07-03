import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAuthFilesUploadFormData,
  normalizeAuthFilesUploadResponse,
  toAuthFilesUploadProgress,
} from '../src/services/api/authFilesUpload.ts';

test('批量认证文件上传把所有文件放进同一个 multipart 字段', async () => {
  const files = [
    new File(['{"type":"codex"}'], 'alpha.json', { type: 'application/json' }),
    new File(['{"type":"claude"}'], 'beta.json', { type: 'application/json' }),
  ];

  const formData = buildAuthFilesUploadFormData(files);
  const entries = formData.getAll('file');

  assert.equal(entries.length, 2);
  assert.equal(entries[0] instanceof File, true);
  assert.equal(entries[1] instanceof File, true);
  assert.equal((entries[0] as File).name, 'alpha.json');
  assert.equal((entries[1] as File).name, 'beta.json');
  assert.equal(await (entries[0] as File).text(), '{"type":"codex"}');
  assert.equal(await (entries[1] as File).text(), '{"type":"claude"}');
});

test('批量认证文件上传归一化后端部分失败响应', () => {
  const result = normalizeAuthFilesUploadResponse(
    {
      status: 'partial',
      uploaded: 1,
      files: ['alpha.json'],
      failed: [{ name: 'beta.json', error: 'invalid json' }],
    },
    2
  );

  assert.deepEqual(result, {
    uploaded: 1,
    files: ['alpha.json'],
    failed: [{ name: 'beta.json', message: 'invalid json' }],
    partial: true,
  });
});

test('批量认证文件上传进度转换为稳定百分比', () => {
  assert.deepEqual(toAuthFilesUploadProgress({ loaded: 64, total: 128 }), {
    loaded: 64,
    total: 128,
    percent: 50,
  });
  assert.deepEqual(toAuthFilesUploadProgress({ loaded: 64 }), {
    loaded: 64,
    total: null,
    percent: null,
  });
});

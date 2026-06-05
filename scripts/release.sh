#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)
EXT_DIR="${REPO_ROOT}/apps/chrome-extension"
RELEASE_DIR="${REPO_ROOT}/release"

# 读取版本号
VERSION=$(node -p "JSON.parse(require('fs').readFileSync('${EXT_DIR}/src/manifest.json','utf8')).version")
ZIP_NAME="ai-hot-v${VERSION}.zip"

echo "=== AI Hot Release Builder ==="
echo "Version: ${VERSION}"
echo ""

# 1. 清理并创建 release 目录
echo "[1/4] Preparing release directory..."
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

# 2. 安装依赖
echo "[2/4] Installing dependencies..."
cd "${REPO_ROOT}"
pnpm install

# 3. 构建扩展
echo "[3/4] Building Chrome extension..."
cd "${EXT_DIR}"
pnpm build

# 4. 打包
echo "[4/4] Packaging release..."
cd "${EXT_DIR}/dist"
zip -r "${RELEASE_DIR}/${ZIP_NAME}" .
cd "${REPO_ROOT}"

# 同时复制一份到 release 目录方便本地加载
cp -r "${EXT_DIR}/dist" "${RELEASE_DIR}/extension"

echo ""
echo "=== Done ==="
echo "Release ZIP:  ${RELEASE_DIR}/${ZIP_NAME}"
echo "Extension dir: ${RELEASE_DIR}/extension"
echo ""
echo "To create a GitHub Release:"
echo "  1. Push all changes to main"
echo "  2. Go to https://github.com/qiushibang/ai-hot/releases/new"
echo "  3. Tag: v${VERSION}"
echo "  4. Upload: ${RELEASE_DIR}/${ZIP_NAME}"
#!/bin/bash

# Zillow CSV Downloader using curl
# This bypasses Node.js axios 403 issues

set -e

DATA_DIR="../data/raw"
mkdir -p "$DATA_DIR"

# User-Agent that works
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

echo "🚀 Downloading Zillow Research CSVs..."
echo ""

# ZHVI - Home Values
echo "📥 ZHVI ZIP..."
curl -L -H "User-Agent: $UA" -H "Referer: https://www.zillow.com/research/data/" \
  "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv" \
  -o "$DATA_DIR/zhvi_zip.csv" --silent --show-error
echo "   ✅ Downloaded $(du -h $DATA_DIR/zhvi_zip.csv | cut -f1)"

echo "📥 ZHVI City..."
curl -L -H "User-Agent: $UA" -H "Referer: https://www.zillow.com/research/data/" \
  "https://files.zillowstatic.com/research/public_csvs/zhvi/City_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv" \
  -o "$DATA_DIR/zhvi_city.csv" --silent --show-error
echo "   ✅ Downloaded $(du -h $DATA_DIR/zhvi_city.csv | cut -f1)"

echo "📥 ZHVI County..."
curl -L -H "User-Agent: $UA" -H "Referer: https://www.zillow.com/research/data/" \
  "https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv" \
  -o "$DATA_DIR/zhvi_county.csv" --silent --show-error
echo "   ✅ Downloaded $(du -h $DATA_DIR/zhvi_county.csv | cut -f1)"

# ZORI - Rent Values
echo "📥 ZORI ZIP..."
curl -L -H "User-Agent: $UA" -H "Referer: https://www.zillow.com/research/data/" \
  "https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_sm_month.csv" \
  -o "$DATA_DIR/zori_zip.csv" --silent --show-error
echo "   ✅ Downloaded $(du -h $DATA_DIR/zori_zip.csv | cut -f1)"

echo "📥 ZORI City..."
curl -L -H "User-Agent: $UA" -H "Referer: https://www.zillow.com/research/data/" \
  "https://files.zillowstatic.com/research/public_csvs/zori/City_zori_sm_month.csv" \
  -o "$DATA_DIR/zori_city.csv" --silent --show-error
echo "   ✅ Downloaded $(du -h $DATA_DIR/zori_city.csv | cut -f1)"

# Market Metrics
echo "📥 Inventory..."
curl -L -H "User-Agent: $UA" -H "Referer: https://www.zillow.com/research/data/" \
  "https://files.zillowstatic.com/research/public_csvs/invt_fs/Zip_invt_fs_uc_sfrcondo_sm_month.csv" \
  -o "$DATA_DIR/inventory_zip.csv" --silent --show-error
echo "   ✅ Downloaded $(du -h $DATA_DIR/inventory_zip.csv | cut -f1)"

echo "📥 Sales Count..."
curl -L -H "User-Agent: $UA" -H "Referer: https://www.zillow.com/research/data/" \
  "https://files.zillowstatic.com/research/public_csvs/sales/Zip_sales_count_now_uc_sfrcondo_month.csv" \
  -o "$DATA_DIR/sales_zip.csv" --silent --show-error
echo "   ✅ Downloaded $(du -h $DATA_DIR/sales_zip.csv | cut -f1)"

echo "📥 Price Cuts..."
curl -L -H "User-Agent: $UA" -H "Referer: https://www.zillow.com/research/data/" \
  "https://files.zillowstatic.com/research/public_csvs/pct_reduced/Zip_pct_reduced_uc_sfrcondo_month.csv" \
  -o "$DATA_DIR/price_cuts_zip.csv" --silent --show-error
echo "   ✅ Downloaded $(du -h $DATA_DIR/price_cuts_zip.csv | cut -f1)"

echo "📥 Days on Market..."
curl -L -H "User-Agent: $UA" -H "Referer: https://www.zillow.com/research/data/" \
  "https://files.zillowstatic.com/research/public_csvs/median_dom/Zip_median_dom_uc_sfrcondo_month.csv" \
  -o "$DATA_DIR/dom_zip.csv" --silent --show-error
echo "   ✅ Downloaded $(du -h $DATA_DIR/dom_zip.csv | cut -f1)"

echo "📥 Sale-to-List Ratio..."
curl -L -H "User-Agent: $UA" -H "Referer: https://www.zillow.com/research/data/" \
  "https://files.zillowstatic.com/research/public_csvs/median_sale_to_list/Zip_median_sale_to_list_uc_sfrcondo_month.csv" \
  -o "$DATA_DIR/sale_to_list_zip.csv" --silent --show-error
echo "   ✅ Downloaded $(du -h $DATA_DIR/sale_to_list_zip.csv | cut -f1)"

echo ""
echo "✅ All downloads complete!"
echo ""
echo "📊 Total size: $(du -sh $DATA_DIR | cut -f1)"
echo "📁 Location: $DATA_DIR"

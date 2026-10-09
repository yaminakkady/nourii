// =========================================================================
// NOURII STORE - GOOGLE APPS SCRIPT BACKEND ENGINE (قاعدة بيانات GOOGLE DRIVE)
// =========================================================================
// هذا السكربت يعمل كـ Backend مجاني 100% داخل Google Drive / Google Sheets
// لربط متجر Nourii بجدول بيانات وإتاحة تخزين الصور في Google Drive مباشرة.
// =========================================================================

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet() ? SpreadsheetApp.getActiveSpreadsheet().getId() : null;

// دالة التهيئة الأولية: تنشئ ورقتي المنتجات والمستخدمين بالأعمدة المطلوبة تلقائياً
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ورقة المنتجات Products
  let prodSheet = ss.getSheetByName("Products");
  if (!prodSheet) {
    prodSheet = ss.insertSheet("Products");
    prodSheet.appendRow([
      "id", "categoryId", "nameAr", "nameEn", "price", "originalPrice",
      "image", "badgeAr", "badgeEn", "rating", "reviewsCount", 
      "isCustomizable", "customFieldLabelAr", "customFieldLabelEn", 
      "descriptionAr", "descriptionEn", "updatedAt"
    ]);
    prodSheet.setFrozenRows(1);
  }

  // 2. ورقة المستخدمين Users
  let usersSheet = ss.getSheetByName("Users");
  if (!usersSheet) {
    usersSheet = ss.insertSheet("Users");
    usersSheet.appendRow([
      "username", "password", "fullName", "role", "createdAt", "isActive"
    ]);
    // إضافة حساب المشرف الافتراضي
    usersSheet.appendRow([
      "admin", "nourii2026", "مدير النظام (Admin)", "admin", new Date().toISOString(), true
    ]);
    usersSheet.setFrozenRows(1);
  }

  // 3. ورقة الطلبات Orders (اختياري لحفظ أرشيف الطلبات)
  let ordersSheet = ss.getSheetByName("Orders");
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet("Orders");
    ordersSheet.appendRow([
      "orderId", "customerName", "phone", "city", "address", 
      "total", "items", "notes", "createdAt"
    ]);
    ordersSheet.setFrozenRows(1);
  }

  return "Database sheets setup completed successfully!";
}

// =========================================================================
// معالجة طلبات GET (جلب المنتجات أو المستخدمين)
// =========================================================================
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getProducts";

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "getProducts") {
      const sheet = ss.getSheetByName("Products");
      if (!sheet) return createResponse({ status: "error", message: "Products sheet not found" });

      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return createResponse({ status: "success", data: [] });

      const headers = data[0];
      const products = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue; // تخطي الصفوف الفارغة
        const item = {};
        for (let j = 0; j < headers.length; j++) {
          item[headers[j]] = row[j];
        }
        // تحويل الأنواع
        item.price = Number(item.price) || 0;
        item.originalPrice = Number(item.originalPrice) || 0;
        item.rating = Number(item.rating) || 5.0;
        item.reviewsCount = Number(item.reviewsCount) || 0;
        item.isCustomizable = item.isCustomizable === true || item.isCustomizable === "true" || item.isCustomizable === "TRUE";
        products.push(item);
      }

      return createResponse({ status: "success", data: products });
    }

    if (action === "getUsers") {
      const sheet = ss.getSheetByName("Users");
      if (!sheet) return createResponse({ status: "error", message: "Users sheet not found" });

      const data = sheet.getDataRange().getValues();
      const users = [];
      const headers = data[0];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;
        users.push({
          username: row[0],
          fullName: row[2],
          role: row[3],
          createdAt: row[4],
          isActive: row[5] === true || row[5] === "true" || row[5] === "TRUE"
        });
      }

      return createResponse({ status: "success", data: users });
    }

    if (action === "ping") {
      return createResponse({ status: "success", message: "Nourii Google Drive API is active!", timestamp: new Date().toISOString() });
    }

    return createResponse({ status: "error", message: "Unknown action" });

  } catch (error) {
    return createResponse({ status: "error", message: error.toString() });
  }
}

// =========================================================================
// معالجة طلبات POST (إضافة، تعديل، حذف، تسجيل دخول، ورفع صور)
// =========================================================================
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    const action = body.action || "saveProduct";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. تسجيل الدخول والتحقق من كلمة المرور
    if (action === "login") {
      const sheet = ss.getSheetByName("Users");
      if (!sheet) return createResponse({ status: "error", message: "Users sheet not found" });

      const data = sheet.getDataRange().getValues();
      const username = (body.username || "").trim().toLowerCase();
      const password = (body.password || "").trim();

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (String(row[0]).trim().toLowerCase() === username && String(row[1]).trim() === password) {
          if (row[5] === false || String(row[5]).toUpperCase() === "FALSE") {
            return createResponse({ status: "error", message: "هذا الحساب معطل حالياً" });
          }
          return createResponse({
            status: "success",
            user: {
              username: row[0],
              fullName: row[2],
              role: row[3]
            }
          });
        }
      }
      return createResponse({ status: "error", message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }

    // 2. حفظ / تعديل منتج (Save / Update Product)
    if (action === "saveProduct") {
      const sheet = ss.getSheetByName("Products");
      const prod = body.product;
      if (!prod || !prod.id) return createResponse({ status: "error", message: "Missing product data" });

      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;

      // البحث عما إذا كان المنتج موجوداً لتحديثه
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(prod.id)) {
          rowIndex = i + 1; // 1-based index
          break;
        }
      }

      const rowValues = [
        prod.id,
        prod.categoryId || "others",
        prod.nameAr || "",
        prod.nameEn || "",
        Number(prod.price) || 0,
        Number(prod.originalPrice) || 0,
        prod.image || "",
        prod.badgeAr || "",
        prod.badgeEn || "",
        Number(prod.rating) || 5.0,
        Number(prod.reviewsCount) || 1,
        Boolean(prod.isCustomizable),
        prod.customFieldLabelAr || "",
        prod.customFieldLabelEn || "",
        prod.descriptionAr || "",
        prod.descriptionEn || "",
        new Date().toISOString()
      ];

      if (rowIndex > 0) {
        // تحديث صف موجود
        sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        // إضافة صف جديد
        sheet.appendRow(rowValues);
      }

      return createResponse({ status: "success", message: "Product saved successfully", product: prod });
    }

    // 3. حذف منتج (Delete Product)
    if (action === "deleteProduct") {
      const sheet = ss.getSheetByName("Products");
      const prodId = body.id;
      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(prodId)) {
          sheet.deleteRow(i + 1);
          return createResponse({ status: "success", message: "Product deleted successfully" });
        }
      }
      return createResponse({ status: "error", message: "Product not found" });
    }

    // 4. حفظ / تعديل مستخدم (Save User)
    if (action === "saveUser") {
      const sheet = ss.getSheetByName("Users");
      const user = body.user;
      if (!user || !user.username) return createResponse({ status: "error", message: "Missing user data" });

      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).toLowerCase() === String(user.username).toLowerCase()) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex > 0) {
        // تحديث
        const existingPass = data[rowIndex - 1][1];
        sheet.getRange(rowIndex, 1, 1, 6).setValues([[
          user.username,
          user.password ? user.password : existingPass,
          user.fullName || "",
          user.role || "editor",
          data[rowIndex - 1][4],
          user.isActive !== false
        ]]);
      } else {
        // إضافة جديد
        sheet.appendRow([
          user.username,
          user.password || "nourii2026",
          user.fullName || user.username,
          user.role || "editor",
          new Date().toISOString(),
          true
        ]);
      }

      return createResponse({ status: "success", message: "User saved successfully" });
    }

    // 5. حذف مستخدم (Delete User)
    if (action === "deleteUser") {
      const sheet = ss.getSheetByName("Users");
      const username = String(body.username || "").toLowerCase();
      if (username === "admin") {
        return createResponse({ status: "error", message: "لا يمكن حذف حساب المشرف الرئيسي الافتراضي" });
      }

      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).toLowerCase() === username) {
          sheet.deleteRow(i + 1);
          return createResponse({ status: "success", message: "User deleted successfully" });
        }
      }
      return createResponse({ status: "error", message: "User not found" });
    }

    // 6. رفع صورة إلى مجلد في Google Drive
    if (action === "uploadImage") {
      const base64Data = body.base64Data;
      const filename = body.filename || `nourii-item-${Date.now()}.jpg`;
      const mimeType = body.mimeType || "image/jpeg";

      if (!base64Data) {
        return createResponse({ status: "error", message: "Missing image data" });
      }

      // البحث عن مجلد "Nourii Media" أو إنشاؤه
      let folders = DriveApp.getFoldersByName("Nourii Media");
      let folder;
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder("Nourii Media");
      }

      const decoded = Utilities.base64Decode(base64Data.split(",")[1] || base64Data);
      const blob = Utilities.newBlob(decoded, mimeType, filename);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const publicUrl = "https://lh3.googleusercontent.com/d/" + file.getId();

      return createResponse({
        status: "success",
        imageUrl: publicUrl,
        fileId: file.getId()
      });
    }

    return createResponse({ status: "error", message: "Unknown action" });

  } catch (err) {
    return createResponse({ status: "error", message: err.toString() });
  }
}

// دالة مساعدة لصياغة الردود كـ JSON مع دعم CORS
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

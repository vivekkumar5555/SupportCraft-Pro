import fs from "fs/promises";
import { createReadStream } from "fs";
import csv from "csv-parser";
import PDFParser from "pdf2json";

/**
 * Parse file content based on file type
 * @param {string} filePath - Path to the file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} - Parsed text content
 */
export const parseFileContent = async (filePath, mimeType) => {
  try {
    switch (mimeType) {
      case "text/plain":
        return await parseTextFile(filePath);
      case "text/csv":
        return await parseCsvFile(filePath);
      case "application/pdf":
        return await parsePdfFile(filePath);
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error("Error parsing file:", error);
    throw new Error(`Failed to parse file: ${error.message}`);
  }
};

/**
 * Parse plain text file
 * @param {string} filePath - Path to the text file
 * @returns {Promise<string>} - File content
 */
const parseTextFile = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content.trim();
  } catch (error) {
    throw new Error(`Failed to read text file: ${error.message}`);
  }
};

/**
 * Parse CSV file and convert to structured text
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<string>} - Structured text content
 */
const parseCsvFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = createReadStream(filePath);

    stream
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        try {
          const structuredText = convertCsvToText(results);
          resolve(structuredText);
        } catch (error) {
          reject(new Error(`Failed to process CSV data: ${error.message}`));
        }
      })
      .on("error", (error) => {
        reject(new Error(`Failed to parse CSV file: ${error.message}`));
      });
  });
};

/**
 * Convert CSV data to structured text
 * @param {Array} csvData - Array of CSV rows
 * @returns {string} - Structured text
 */
const convertCsvToText = (csvData) => {
  if (csvData.length === 0) {
    return "";
  }

  // Get column names
  const columns = Object.keys(csvData[0]);

  // Check for common FAQ column patterns
  const questionColumns = columns.filter(
    (col) =>
      col.toLowerCase().includes("question") ||
      col.toLowerCase().includes("q") ||
      col.toLowerCase().includes("ask")
  );

  const answerColumns = columns.filter(
    (col) =>
      col.toLowerCase().includes("answer") ||
      col.toLowerCase().includes("a") ||
      col.toLowerCase().includes("response") ||
      col.toLowerCase().includes("reply")
  );

  // If we have question/answer columns, format as FAQ
  if (questionColumns.length > 0 && answerColumns.length > 0) {
    const faqText = csvData
      .map((row, index) => {
        const question = questionColumns.map((col) => row[col]).join(" ");
        const answer = answerColumns.map((col) => row[col]).join(" ");

        return `FAQ ${index + 1}:
Question: ${question}
Answer: ${answer}

`;
      })
      .join("");

    return faqText;
  }

  // Otherwise, format as general data
  const generalText = csvData
    .map((row, index) => {
      const rowText = columns.map((col) => `${col}: ${row[col]}`).join(", ");
      return `Entry ${index + 1}: ${rowText}\n`;
    })
    .join("");

  return generalText;
};

/**
 * Parse PDF file and extract text
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<string>} - Extracted text content
 */
const parsePdfFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      reject(new Error(`Failed to parse PDF file: ${errData.parserError}`));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        // Extract text from parsed PDF data
        let text = "";

        if (pdfData.Pages) {
          pdfData.Pages.forEach((page) => {
            if (page.Texts) {
              page.Texts.forEach((textItem) => {
                if (textItem.R) {
                  textItem.R.forEach((textRun) => {
                    if (textRun.T) {
                      text += decodeURIComponent(textRun.T) + " ";
                    }
                  });
                }
              });
              text += "\n";
            }
          });
        }

        if (!text || text.trim().length === 0) {
          reject(new Error("No text content found in PDF"));
        } else {
          resolve(text.trim());
        }
      } catch (error) {
        reject(new Error(`Failed to extract text from PDF: ${error.message}`));
      }
    });

    pdfParser.loadPDF(filePath);
  });
};

/**
 * Validate file before parsing
 * @param {Object} file - File object
 * @returns {Object} - Validation result
 */
export const validateFile = (file) => {
  const errors = [];

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push("File size exceeds 10MB limit");
  }

  // Check file type
  const allowedTypes = ["text/plain", "text/csv", "application/pdf"];
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push("Invalid file type. Only TXT, CSV, and PDF files are allowed");
  }

  // Check file extension
  const allowedExtensions = [".txt", ".csv", ".pdf"];
  const fileExtension = file.originalname
    .toLowerCase()
    .substring(file.originalname.lastIndexOf("."));
  if (!allowedExtensions.includes(fileExtension)) {
    errors.push("Invalid file extension");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Extract metadata from file
 * @param {Object} file - File object
 * @returns {Object} - File metadata
 */
export const extractFileMetadata = (file) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
    mimeType: file.mimetype,
    extension: file.originalname.substring(file.originalname.lastIndexOf(".")),
    uploadedAt: new Date().toISOString(),
  };
};

/**
 * Clean and normalize text content
 * @param {string} text - Raw text content
 * @returns {string} - Cleaned text
 */
export const cleanTextContent = (text) => {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\r/g, "\n") // Normalize line endings
    .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
    .replace(/\s{2,}/g, " ") // Normalize whitespace
    .trim();
};

/**
 * Split text into chunks for embedding
 * @param {string} text - Text to split
 * @param {number} maxTokens - Maximum tokens per chunk
 * @returns {Array<string>} - Array of text chunks
 */
export const splitTextIntoChunks = (text, maxTokens = 800) => {
  if (!text || typeof text !== "string") {
    return [];
  }

  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];

  for (const word of words) {
    currentChunk.push(word);

    if (currentChunk.length >= maxTokens) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [];
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
};

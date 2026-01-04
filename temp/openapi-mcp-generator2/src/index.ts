#!/usr/bin/env node
/**
 * MCP Server generated from OpenAPI spec for codebeamer-swagger-api v3.0
 * Generated on: 2025-08-31T16:21:43.428Z
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
  type CallToolResult,
  type CallToolRequest
} from "@modelcontextprotocol/sdk/types.js";

import { z, ZodError } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import axios, { type AxiosRequestConfig, type AxiosError } from 'axios';

/**
 * Type definition for JSON objects
 */
type JsonObject = Record<string, any>;

/**
 * Interface for MCP Tool Definition
 */
interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
    method: string;
    pathTemplate: string;
    executionParameters: { name: string, in: string }[];
    requestBodyContentType?: string;
    securityRequirements: any[];
}

/**
 * Server configuration
 */
export const SERVER_NAME = "codebeamer-swagger-api";
export const SERVER_VERSION = "3.0";
export const API_BASE_URL = "https://codebeamer.com/cb/api";

/**
 * MCP Server instance
 */
const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
);

/**
 * Map of tool definitions by name
 */
const toolDefinitionMap: Map<string, McpToolDefinition> = new Map([

  ["getMasterSyncTime", {
    name: "getMasterSyncTime",
    description: `Get the sync time of master`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/database/master/sync",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getReadOnlySyncTime", {
    name: "getReadOnlySyncTime",
    description: `Get the sync time of readonly`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/database/readonly/sync",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["createAssociation", {
    name: "createAssociation",
    description: `Create a new association`,
    inputSchema: {"type":"object","properties":{"requestBody":{"required":["from"],"type":"object","properties":{"baselineId":{"type":"number","description":"Baseline ID","format":"int32"},"biDirectionalPropagation":{"type":"boolean","description":"Bi-directional reference"},"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"description":{"type":"string","description":"Description of the entity"},"descriptionFormat":{"type":"string","description":"Description format of the entity","enum":["PlainText","Html","Wiki"]},"from":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"propagatingDependencies":{"type":"boolean","description":"Propagating dependencies"},"propagatingSuspects":{"type":"boolean","description":"Propagating suspects"},"reversePropagation":{"type":"boolean","description":"Reverse propagation"},"to":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"type":{"type":"object","description":"Reference to an association type","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"url":{"type":"string","description":"Association to url"}},"description":"Basic properties of a codebeamer association"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/associations",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getAvailableAssociationTypes", {
    name: "getAvailableAssociationTypes",
    description: `Get available association types`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/v3/associations/types",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getAssociationType", {
    name: "getAssociationType",
    description: `Get association type by id`,
    inputSchema: {"type":"object","properties":{"associationTypeId":{"type":"number","format":"int32"}},"required":["associationTypeId"]},
    method: "get",
    pathTemplate: "/v3/associations/types/{associationTypeId}",
    executionParameters: [{"name":"associationTypeId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getAssociation", {
    name: "getAssociation",
    description: `Get an association by id`,
    inputSchema: {"type":"object","properties":{"associationId":{"type":"number","format":"int32"}},"required":["associationId"]},
    method: "get",
    pathTemplate: "/v3/associations/{associationId}",
    executionParameters: [{"name":"associationId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateAssociation", {
    name: "updateAssociation",
    description: `Update association settings`,
    inputSchema: {"type":"object","properties":{"associationId":{"type":"number","format":"int32"},"requestBody":{"required":["from"],"type":"object","properties":{"baselineId":{"type":"number","description":"Baseline ID","format":"int32"},"biDirectionalPropagation":{"type":"boolean","description":"Bi-directional reference"},"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"description":{"type":"string","description":"Description of the entity"},"descriptionFormat":{"type":"string","description":"Description format of the entity","enum":["PlainText","Html","Wiki"]},"from":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"propagatingDependencies":{"type":"boolean","description":"Propagating dependencies"},"propagatingSuspects":{"type":"boolean","description":"Propagating suspects"},"reversePropagation":{"type":"boolean","description":"Reverse propagation"},"to":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"type":{"type":"object","description":"Reference to an association type","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"url":{"type":"string","description":"Association to url"}},"description":"Basic properties of a codebeamer association"}},"required":["associationId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/associations/{associationId}",
    executionParameters: [{"name":"associationId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["deleteAssociation", {
    name: "deleteAssociation",
    description: `Delete association`,
    inputSchema: {"type":"object","properties":{"associationId":{"type":"number","format":"int32"}},"required":["associationId"]},
    method: "delete",
    pathTemplate: "/v3/associations/{associationId}",
    executionParameters: [{"name":"associationId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getAssociationHistory", {
    name: "getAssociationHistory",
    description: `Returns the change history of the specified association`,
    inputSchema: {"type":"object","properties":{"associationId":{"type":"number","format":"int32"},"page":{"type":"number","format":"int32","default":1,"description":"Index of the result page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in a result page. Max value: 500"}},"required":["associationId"]},
    method: "get",
    pathTemplate: "/v3/associations/{associationId}/history",
    executionParameters: [{"name":"associationId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getAttachment", {
    name: "getAttachment",
    description: `Get attachment by id`,
    inputSchema: {"type":"object","properties":{"attachmentId":{"type":"number","format":"int32"},"version":{"type":"number","format":"int32"}},"required":["attachmentId"]},
    method: "get",
    pathTemplate: "/v3/attachments/{attachmentId}",
    executionParameters: [{"name":"attachmentId","in":"path"},{"name":"version","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["deleteAttachment", {
    name: "deleteAttachment",
    description: `Deletes an attachment`,
    inputSchema: {"type":"object","properties":{"attachmentId":{"type":"number","format":"int32"}},"required":["attachmentId"]},
    method: "delete",
    pathTemplate: "/v3/attachments/{attachmentId}",
    executionParameters: [{"name":"attachmentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getAttachmentContent", {
    name: "getAttachmentContent",
    description: `Get content of an attachment by id`,
    inputSchema: {"type":"object","properties":{"attachmentId":{"type":"number","format":"int32"},"version":{"type":"number","format":"int32"}},"required":["attachmentId"]},
    method: "get",
    pathTemplate: "/v3/attachments/{attachmentId}/content",
    executionParameters: [{"name":"attachmentId","in":"path"},{"name":"version","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateAttachment", {
    name: "updateAttachment",
    description: `Update attachment`,
    inputSchema: {"type":"object","properties":{"attachmentId":{"type":"number","format":"int32"},"requestBody":{"type":"string","description":"Request body (content type: multipart/form-data)"}},"required":["attachmentId"]},
    method: "put",
    pathTemplate: "/v3/attachments/{attachmentId}/content",
    executionParameters: [{"name":"attachmentId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getAttachmentHistory", {
    name: "getAttachmentHistory",
    description: `Returns the change history of the specified attachment`,
    inputSchema: {"type":"object","properties":{"attachmentId":{"type":"number","format":"int32"},"page":{"type":"number","format":"int32","default":1,"description":"Index of the result page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in a result page. Max value: 500"}},"required":["attachmentId"]},
    method: "get",
    pathTemplate: "/v3/attachments/{attachmentId}/history",
    executionParameters: [{"name":"attachmentId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["restoreAttachment", {
    name: "restoreAttachment",
    description: `Restore attachment to previous version`,
    inputSchema: {"type":"object","properties":{"attachmentId":{"type":"number","format":"int32"},"version":{"type":"number","format":"int32"}},"required":["attachmentId","version"]},
    method: "put",
    pathTemplate: "/v3/attachments/{attachmentId}/restore",
    executionParameters: [{"name":"attachmentId","in":"path"},{"name":"version","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["createBaseline", {
    name: "createBaseline",
    description: `Create a project or tracker baseline`,
    inputSchema: {"type":"object","properties":{"requestBody":{"required":["name","project"],"type":"object","properties":{"description":{"type":"string","description":"Description of baseline"},"name":{"type":"string","description":"Name of baseline"},"project":{"type":"object","description":"Reference to a project","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"tracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/baselines",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItemOnBranch", {
    name: "getTrackerItemOnBranch",
    description: `API can be used for finding a tracker item by a branch id`,
    inputSchema: {"type":"object","properties":{"sourceItemId":{"type":"number","format":"int32"},"branchId":{"type":"number","format":"int32"}},"required":["sourceItemId","branchId"]},
    method: "get",
    pathTemplate: "/v3/branches/{branchId}/item",
    executionParameters: [{"name":"sourceItemId","in":"query"},{"name":"branchId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["uploadDeployment", {
    name: "uploadDeployment",
    description: `Start a deployment process`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"string","description":"Request body (content type: multipart/form-data)"}}},
    method: "post",
    pathTemplate: "/v3/deployment",
    executionParameters: [],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["exportForDeployment", {
    name: "exportForDeployment",
    description: `Export projects for deployment`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","properties":{"exportFileName":{"type":"string","description":"Name of the resulting export file (without extension)."},"password":{"type":"string","description":"A password that is used during the project encryption."},"projectSettings":{"type":"array","description":"Project settings","items":{"required":["projectId"],"type":"object","properties":{"includeQueries":{"type":"boolean","description":"Flag if queries are included."},"includeTrackerItems":{"type":"boolean","description":"Flag if tracker items are included."},"includeTrackers":{"type":"boolean","description":"Flag if trackers are included."},"projectId":{"type":"number","description":"Project id","format":"int32"},"trackers":{"type":"array","description":"Tracker export settings","items":{"required":["trackerId"],"type":"object","properties":{"itemsIncluded":{"type":"boolean","description":"Flag if tracker items are included."},"trackerId":{"type":"number","description":"Project id","format":"int32"}},"description":"Tracker export settings for deployment"}}},"description":"Project export settings for deployment"}},"schemaName":{"type":"string","description":"Name of deployment settings schema"},"schemaVersion":{"type":"string","description":"Version of deployment settings schema"}},"description":"Request export for deployment"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/deployment/export",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["exportToWord", {
    name: "exportToWord",
    description: `API can be used for exporting items to Word`,
    inputSchema: {"type":"object","properties":{"requestBody":{"required":["currentItemId","exportTargetTrackerId","wordFilename"],"type":"object","properties":{"currentItemAndItsChildren":{"type":"boolean","description":"The children of the current item should be included also or not"},"currentItemId":{"type":"number","description":"The id of the item","format":"int32"},"exportTargetTrackerFolderId":{"type":"number","description":"The Document tracker Folder where the exported file will be stored","format":"int32"},"exportTargetTrackerId":{"type":"number","description":"The id of the Document type Tracker","format":"int32"},"newVersion":{"type":"boolean","description":"If true, new version of the file will be created (timestamp added), otherwise previous file will be overwritten"},"reportId":{"type":"number","description":"If specified, the report result will be in the Word document instead of the current item (and its children, if this set)","format":"int32"},"wordFilename":{"type":"string","description":"The name of the generated Word document"},"wordTemplateName":{"type":"string","description":"Which Word template should be used for the Word document generation"}},"description":"Request model for exporting items to Word"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/export/exportToWord",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItems", {
    name: "getTrackerItems",
    description: `API can be used for fetching basic information of tracker items`,
    inputSchema: {"type":"object","properties":{"baselineId":{"type":"number","format":"int32"},"requestBody":{"type":"object","properties":{"items":{"type":"array","description":"Item references.","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"type":{"type":"string","description":"Type of a ItemsRequest"}},"description":"Request model for multiple items.","discriminator":{"propertyName":"type"}}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/export/items",
    executionParameters: [{"name":"baselineId","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["batchGetTrackerItemReviews", {
    name: "batchGetTrackerItemReviews",
    description: `Get tracker item reviews by a list of tracker item IDs`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","properties":{"baselineId":{"type":"number","description":"Optional Baseline ID","format":"int32"},"itemIds":{"type":"array","description":"List of Tracker Item IDs","items":{"type":"number","description":"List of Tracker Item IDs","format":"int32"}}},"description":"Request model to fetch Tracker Item Reviews for multiple Tracker Items."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/export/tracker-item-reviews",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItemsAttachmentContents", {
    name: "getTrackerItemsAttachmentContents",
    description: `Get attachments of tracker items matching the extension or mime type filters`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","description":"Request data to retrieve tracker item attachments.","allOf":[{"type":"object","properties":{"items":{"type":"array","description":"Item references.","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"type":{"type":"string","description":"Type of a ItemsRequest"}},"description":"Request model for multiple items.","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"baselineId":{"type":"integer","description":"Baseline id to specify the versions of the tracker items.","format":"int32","example":1203},"excludeFilter":{"type":"boolean","description":"Indicator if the attachments matching the filters need to be excluded or not","example":false},"extensions":{"type":"array","description":"File extension filters.","example":["docx","xlsx"],"items":{"type":"string","description":"File extension filters.","example":"[\"docx\",\"xlsx\"]"}},"mimeTypes":{"type":"array","description":"File mime type filters.","example":["image/png","application/zip"],"items":{"type":"string","description":"File mime type filters.","example":"[\"image/png\",\"application/zip\"]"}}}}]}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/items/attachments/content",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["bulkUpdateTrackerItemFields", {
    name: "bulkUpdateTrackerItemFields",
    description: `Bulk update fields of a tracker item`,
    inputSchema: {"type":"object","properties":{"atomic":{"type":"boolean","default":false,"description":"If it's turned on the whole update will run in a single transaction."},"requestBody":{"type":"array","items":{"type":"object","properties":{"fieldValues":{"type":"array","description":"Fields of a tracker item","items":{"required":["type"],"type":"object","properties":{"fieldId":{"type":"number","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId."},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}}},"itemId":{"type":"number","description":"Id of a tracker item","format":"int32"},"tableValues":{"type":"array","description":"Fields of a tracker item","items":{"required":["type"],"type":"object","description":"Value container of a table field","allOf":[{"required":["type"],"type":"object","properties":{"fieldId":{"type":"integer","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId.","writeOnly":true},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"values":{"type":"array","description":"Table values","items":{"type":"array","description":"Table values","items":{"required":["type"],"type":"object","properties":{"fieldId":{"type":"integer","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId.","writeOnly":true},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}}}}}}]}}},"description":"Update fields of a tracker item and provide the itemId as well"},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "put",
    pathTemplate: "/v3/items/fields",
    executionParameters: [{"name":"atomic","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["moveTrackerItems", {
    name: "moveTrackerItems",
    description: `Move Tracker Items from the Source Tracker to the Target Tracker. The items are optional, if it is not provided all the Tracker Items will be moved from the Source Tracker. All the fields from the Source Tracker must be in the mapping. If you want to ignore one you set the targetField to null in the request.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"required":["fieldMapping","sourceTracker","targetTracker"],"type":"object","properties":{"fieldMapping":{"type":"array","description":"Field mappings between the Source Tacker and the Target Tracker.","items":{"required":["sourceField"],"type":"object","properties":{"sourceField":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"property":{"type":"string","description":"Tracker field property name"},"typeName":{"type":"string","description":"Tracker field type"}},"description":"Information of Tracker field"},"targetField":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"property":{"type":"string","description":"Tracker field property name"},"typeName":{"type":"string","description":"Tracker field type"}},"description":"Information of Tracker field"}},"description":"Tracker field mapping pair"}},"items":{"type":"array","description":"Optional Tracker Item list. If not provided all Tracker Items from the Source Tracker are moved.","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"sourceTracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"targetTracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"description":"Request for Tracker Items move."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/items/move",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getItemMoveFieldMapping", {
    name: "getItemMoveFieldMapping",
    description: `Gets the default field mapping between two trackers`,
    inputSchema: {"type":"object","properties":{"sourceTrackerId":{"type":"number","format":"int32","description":"The id of the source Tracker"},"targetTrackerId":{"type":"number","format":"int32","description":"The id of the target Tracker"}},"required":["sourceTrackerId","targetTrackerId"]},
    method: "get",
    pathTemplate: "/v3/items/move/field-mapping",
    executionParameters: [{"name":"sourceTrackerId","in":"query"},{"name":"targetTrackerId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["findTrackerItems", {
    name: "findTrackerItems",
    description: `Get tracker items by cbQL query string`,
    inputSchema: {"type":"object","properties":{"baselineId":{"type":"number","format":"int32","description":"Baseline on which the queery is applied."},"page":{"type":"number","format":"int32","default":1,"description":"Index of the result page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in a result page. Max value: 500"},"queryString":{"type":"string"}},"required":["queryString"]},
    method: "get",
    pathTemplate: "/v3/items/query",
    executionParameters: [{"name":"baselineId","in":"query"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"},{"name":"queryString","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["findTrackerItemsByCbQL", {
    name: "findTrackerItemsByCbQL",
    description: `API can be called with a complex cbQL string to find tracker items`,
    inputSchema: {"type":"object","properties":{"requestBody":{"required":["queryString"],"type":"object","properties":{"baselineId":{"type":"number","description":"Baseline on which the query is applied.","format":"int32"},"page":{"type":"number","description":"Index of the page","format":"int32","default":1},"pageSize":{"type":"number","description":"Size of the found page","format":"int32","default":25},"queryString":{"type":"string","description":"CbQL query for the requested items"}},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/items/query",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getBaselineTrackerItemsRelations", {
    name: "getBaselineTrackerItemsRelations",
    description: `Use this endpoint to fetch tracker items related to some specified tracker items. The relations include downstream references, upstream references, incoming associations and outgoing associations of the given items. Relations with entities that are not tracker items (e.g., trackers, projects, URLs, etc.) will not be included in the result.`,
    inputSchema: {"type":"object","properties":{"baselineId":{"type":"number","format":"int32"},"requestBody":{"type":"object","properties":{"items":{"type":"array","description":"Item references.","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"type":{"type":"string","description":"Type of a ItemsRequest"}},"description":"Request model for multiple items.","discriminator":{"propertyName":"type"}}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/items/relations",
    executionParameters: [{"name":"baselineId","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItem", {
    name: "getTrackerItem",
    description: `API can be used for fetching basic information of a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"version":{"type":"number","format":"int32"},"baselineId":{"type":"number","format":"int32"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"version","in":"query"},{"name":"baselineId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateTrackerItem", {
    name: "updateTrackerItem",
    description: `Update tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"referenceItemId":{"type":"number","format":"int32"},"position":{"type":"string","enum":["BEFORE","AFTER","BELOW"]},"requestBody":{"type":"object","properties":{"accruedMillis":{"type":"number","description":"Accrued work time of a tracker item in milliseconds","format":"int64"},"angularIcon":{"type":"string","description":"Angular icon for the tracker item"},"areas":{"type":"array","description":"Areas of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"assignedAt":{"type":"string","description":"Assignee date of a tracker item","format":"date-time"},"assignedTo":{"type":"array","description":"Assignees of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"categories":{"type":"array","description":"Categories of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"children":{"type":"array","description":"Children of a tracker item","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"closedAt":{"type":"string","description":"Close date of a tracker item","format":"date-time"},"comments":{"type":"array","description":"Comment in the tracker item","items":{"type":"object","description":"Reference to a comment of a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"commonItemId":{"type":"number","description":"Id shared by the branched versions of the tracker item","format":"int32"},"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"customFields":{"type":"array","description":"Custom field of a tracker item","items":{"required":["type"],"type":"object","properties":{"fieldId":{"type":"number","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId."},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}}},"description":{"type":"string","description":"Description of the entity"},"descriptionFormat":{"type":"string","description":"Description format of the entity","enum":["PlainText","Html","Wiki"]},"endDate":{"type":"string","description":"End date of a tracker item","format":"date-time"},"estimatedMillis":{"type":"number","description":"Estimated work time of a tracker item in milliseconds","format":"int64"},"formality":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"iconColor":{"type":"string","description":"Color of the tracker item icon"},"iconUrl":{"type":"string","description":"Url of the tracker item icon"},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"modifiedAt":{"type":"string","description":"The date when the entity was modified","format":"date-time"},"modifiedBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"name":{"type":"string","description":"Name of the entity"},"ordinal":{"type":"number","description":"Ordinal of a tracker item","format":"int32"},"owners":{"type":"array","description":"Owners of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"parent":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]},"platforms":{"type":"array","description":"Platforms of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"priority":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"releaseMethod":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"resolutions":{"type":"array","description":"Resolutions of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"severities":{"type":"array","description":"Severities of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"spentMillis":{"type":"number","description":"Spent work time of a tracker item in milliseconds","format":"int64"},"startDate":{"type":"string","description":"Start date of a tracker item","format":"date-time"},"status":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"storyPoints":{"type":"number","description":"Story points of a tracker item","format":"int32"},"subjects":{"type":"array","description":"Subjects of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"tags":{"type":"array","description":"Tags of the tracker item","items":{"type":"object","properties":{"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"hidden":{"type":"boolean","description":"Whether the label is hidden or not"},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"privateLabel":{"type":"boolean","description":"Whether the label is private or not"}},"description":"Label that is used for entities like tags."}},"teams":{"type":"array","description":"Teams of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"tracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"typeName":{"type":"string","description":"Type name of a tracker item"},"version":{"type":"number","description":"Version of a tracker item","format":"int32"},"versions":{"type":"array","description":"Versions of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}}},"description":"Basic properties of a codebeamer tracker item"}},"required":["itemId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/items/{itemId}",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"referenceItemId","in":"query"},{"name":"position","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["deleteTrackerItem", {
    name: "deleteTrackerItem",
    description: `Move tracker item to trash`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"}},"required":["itemId"]},
    method: "delete",
    pathTemplate: "/v3/items/{itemId}",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItemAttachments", {
    name: "getTrackerItemAttachments",
    description: `Get attachments of tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32","description":"Id of the tracker item"},"fileName":{"type":"string","description":"Filter by part of the filename of the attachments"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/attachments",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"fileName","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["uploadTrackerItemAttachment", {
    name: "uploadTrackerItemAttachment",
    description: `Upload an attachment to a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"requestBody":{"type":"string","description":"Request body (content type: multipart/form-data)"}},"required":["itemId"]},
    method: "post",
    pathTemplate: "/v3/items/{itemId}/attachments",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["deleteTrackerItemAttachments", {
    name: "deleteTrackerItemAttachments",
    description: `Delete attachments of tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"deleteAttachmentGroup":{"type":"boolean","default":false,"description":"Delete attachment group or delete just the attachment and let the comment there"}},"required":["itemId"]},
    method: "delete",
    pathTemplate: "/v3/items/{itemId}/attachments",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"deleteAttachmentGroup","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItemAttachmentContents", {
    name: "getTrackerItemAttachmentContents",
    description: `Get attachments of a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/attachments/content",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItemAttachment", {
    name: "getTrackerItemAttachment",
    description: `Get attachment of tracker item by id`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"attachmentId":{"type":"number","format":"int32"}},"required":["itemId","attachmentId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/attachments/{attachmentId}",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["deleteTrackerItemAttachment", {
    name: "deleteTrackerItemAttachment",
    description: `Delete attachment of tracker item by id`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"attachmentId":{"type":"number","format":"int32"},"deleteAttachmentGroup":{"type":"boolean","default":false,"description":"Delete attachment group or delete just the attachment and let the comment there"}},"required":["itemId","attachmentId"]},
    method: "delete",
    pathTemplate: "/v3/items/{itemId}/attachments/{attachmentId}",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"attachmentId","in":"path"},{"name":"deleteAttachmentGroup","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItemAttachmentContent", {
    name: "getTrackerItemAttachmentContent",
    description: `Get content of an attachment of tracker item by id`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"attachmentId":{"type":"number","format":"int32"}},"required":["itemId","attachmentId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/attachments/{attachmentId}/content",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateAttachmentOfTrackerItem", {
    name: "updateAttachmentOfTrackerItem",
    description: `Update content of attachment of tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"attachmentId":{"type":"number","format":"int32"},"requestBody":{"type":"string","description":"Request body (content type: multipart/form-data)"}},"required":["itemId","attachmentId"]},
    method: "put",
    pathTemplate: "/v3/items/{itemId}/attachments/{attachmentId}/content",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"attachmentId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["findTrackerItemChildren", {
    name: "findTrackerItemChildren",
    description: `Get child items of a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"page":{"type":"number","format":"int32","default":1,"description":"Index of the result page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in a result page. Max value: 500"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/children",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["replaceChildrenOfTrackerItem", {
    name: "replaceChildrenOfTrackerItem",
    description: `Replace the child item list of a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"resultPageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in the result page. Max value: 500"},"requestBody":{"type":"object","properties":{"children":{"type":"array","description":"Child items to update","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}}},"description":"Tracker item child update request"}},"required":["itemId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/items/{itemId}/children",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"resultPageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["addChildToTrackerItem", {
    name: "addChildToTrackerItem",
    description: `Add a child item to a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"requestBody":{"type":"object","properties":{"commonItemId":{"type":"number","description":"Tracker common item id","format":"int32"},"id":{"type":"number","description":"Tracker item id","format":"int32"},"version":{"type":"number","description":"Tracker item version","format":"int32"}},"description":"Tracker item revision identifier"}},"required":["itemId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/items/{itemId}/children",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["patchChildrenOfTrackerItem", {
    name: "patchChildrenOfTrackerItem",
    description: `Patch the child item list of a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"mode":{"type":"string","enum":["INSERT","REPLACE","REMOVE"]},"requestBody":{"required":["index","itemReference"],"type":"object","properties":{"index":{"minimum":0,"type":"number","description":"Ordinal in the tracker outline.","format":"int32"},"itemReference":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"description":"Reference to a child item in the tracker outline."}},"required":["itemId","mode","requestBody"]},
    method: "patch",
    pathTemplate: "/v3/items/{itemId}/children",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"mode","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItemComments", {
    name: "getTrackerItemComments",
    description: `Get comments of tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32","description":"Id of a tracker item"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/comments",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["commentOnTrackerItem", {
    name: "commentOnTrackerItem",
    description: `Comment on a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"requestBody":{"type":"string","description":"Request body (content type: multipart/form-data)"}},"required":["itemId"]},
    method: "post",
    pathTemplate: "/v3/items/{itemId}/comments",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["deleteTrackerItemComments", {
    name: "deleteTrackerItemComments",
    description: `Delete comments of tracker item by item id`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"}},"required":["itemId"]},
    method: "delete",
    pathTemplate: "/v3/items/{itemId}/comments",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItemComment", {
    name: "getTrackerItemComment",
    description: `Get comment of tracker item by id`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"commentId":{"type":"number","format":"int32"}},"required":["itemId","commentId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/comments/{commentId}",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"commentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["editCommentOnTrackerItem", {
    name: "editCommentOnTrackerItem",
    description: `Edit comment on a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"commentId":{"type":"number","format":"int32"},"requestBody":{"type":"string","description":"Request body (content type: multipart/form-data)"}},"required":["itemId","commentId"]},
    method: "put",
    pathTemplate: "/v3/items/{itemId}/comments/{commentId}",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"commentId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["replyOnCommentOfTrackerItem", {
    name: "replyOnCommentOfTrackerItem",
    description: `Reply on a comment of a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"commentId":{"type":"number","format":"int32"},"requestBody":{"type":"string","description":"Request body (content type: multipart/form-data)"}},"required":["itemId","commentId"]},
    method: "post",
    pathTemplate: "/v3/items/{itemId}/comments/{commentId}",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"commentId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["deleteTrackerItemComment", {
    name: "deleteTrackerItemComment",
    description: `Delete comment of tracker item by id`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"commentId":{"type":"number","format":"int32"}},"required":["itemId","commentId"]},
    method: "delete",
    pathTemplate: "/v3/items/{itemId}/comments/{commentId}",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"commentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItemFields", {
    name: "getTrackerItemFields",
    description: `Get fields of a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/fields",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateCustomFieldTrackerItem", {
    name: "updateCustomFieldTrackerItem",
    description: `Update fields of a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"quietMode":{"type":"boolean","default":false,"description":"If it's turned on HTTP 200 with empty response indicates that the update was successful."},"requestBody":{"type":"object","properties":{"fieldValues":{"type":"array","description":"Fields of a tracker item","items":{"required":["type"],"type":"object","properties":{"fieldId":{"type":"number","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId."},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}}},"tableValues":{"type":"array","description":"Fields of a tracker item","items":{"required":["type"],"type":"object","description":"Value container of a table field","allOf":[{"required":["type"],"type":"object","properties":{"fieldId":{"type":"integer","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId.","writeOnly":true},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"values":{"type":"array","description":"Table values","items":{"type":"array","description":"Table values","items":{"required":["type"],"type":"object","properties":{"fieldId":{"type":"integer","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId.","writeOnly":true},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}}}}}}]}}},"description":"Update fields of a tracker item"}},"required":["itemId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/items/{itemId}/fields",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"quietMode","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getItemAccessibility", {
    name: "getItemAccessibility",
    description: `Get a tracker item fields accessibility`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32","description":"Tracker item id"},"targetStatusId":{"type":"number","format":"int32"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/fields/accessibility",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"targetStatusId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateTableFieldTrackerItem", {
    name: "updateTableFieldTrackerItem",
    description: `Update table field of tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"tableFieldId":{"type":"number","format":"int32"},"requestBody":{"type":"object","properties":{"rows":{"type":"array","description":"Table rows of a tracker table item","items":{"type":"array","description":"Table rows of a tracker table item","items":{"required":["type"],"type":"object","properties":{"fieldId":{"type":"number","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId."},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}}}}},"description":"The JSON request body."}},"required":["itemId","tableFieldId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/items/{itemId}/fields/tables/{tableFieldId}",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"tableFieldId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getChoiceOptions", {
    name: "getChoiceOptions",
    description: `Get the options of a choice field of tracker`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"fieldId":{"type":"number","format":"int32"},"page":{"type":"number","format":"int32","default":1,"description":"Index of the result page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in a result page. Max value: 500"}},"required":["itemId","fieldId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/fields/{fieldId}/options",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"fieldId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItemHistory", {
    name: "getTrackerItemHistory",
    description: `API can be used for fetching basic information of a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/history",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["checkTrackerItemLock", {
    name: "checkTrackerItemLock",
    description: `Check whether a tracker item is locked, and if it is, retrieve the details of the lock`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32","description":"Tracker item id"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/lock",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["lockTrackerItem", {
    name: "lockTrackerItem",
    description: `Put a soft lock on a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32","description":"Tracker item id"},"requestBody":{"type":"object","properties":{"duration":{"type":"string","description":"If not a hard lock, the duration specified in time notation"},"hard":{"type":"boolean","description":"Whether the lock should be hard"}},"description":"Requested lock configuration"}},"required":["itemId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/items/{itemId}/lock",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["unlockTrackerItem", {
    name: "unlockTrackerItem",
    description: `Unlock a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32","description":"Tracker item id"}},"required":["itemId"]},
    method: "delete",
    pathTemplate: "/v3/items/{itemId}/lock",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getBaselineTrackerItemRelations", {
    name: "getBaselineTrackerItemRelations",
    description: `Use this endpoint to fetch tracker items related to a specified tracker item. The relations include downstream references, upstream references, incoming associations and outgoing associations of the given item. Relations with entities that are not tracker items (e.g., trackers, projects, URLs, etc.) will not be included in the result.`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"},"baselineId":{"type":"number","format":"int32"},"page":{"type":"number","format":"int32","default":1,"description":"Index of page, starting from 1."},"pageSize":{"type":"number","format":"int32","default":500,"description":"Number of items per page. Max value: 500"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/relations",
    executionParameters: [{"name":"itemId","in":"path"},{"name":"baselineId","in":"query"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItemReviews", {
    name: "getTrackerItemReviews",
    description: `Get all Tracker Item Reviews for a particular Tracker Item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/reviews",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerItemTransitions", {
    name: "getTrackerItemTransitions",
    description: `API can be used for getting available transitions for a tracker item`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32"}},"required":["itemId"]},
    method: "get",
    pathTemplate: "/v3/items/{itemId}/transitions",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getBackgroundJob", {
    name: "getBackgroundJob",
    description: `Retrieve background job information`,
    inputSchema: {"type":"object","properties":{"jobId":{"type":"number","format":"int32"}},"required":["jobId"]},
    method: "get",
    pathTemplate: "/v3/job/{jobId}",
    executionParameters: [{"name":"jobId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateWorkingSet", {
    name: "updateWorkingSet",
    description: `This API can be used start a Job that merges changes from the source into the target Working-Set replacing the content of the specified target trackers completely.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"required":["source","target"],"type":"object","properties":{"projectBaselineId":{"type":"number","format":"int32"},"source":{"type":"object","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"target":{"type":"object","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"trackers":{"uniqueItems":true,"type":"array","items":{"required":["tracker"],"type":"object","properties":{"baselineId":{"type":"number","format":"int32"},"cbql":{"type":"string"},"tracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}}}}},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/jobs/working-set-update",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateWorkingSetWithTransientFields", {
    name: "updateWorkingSetWithTransientFields",
    description: `This API can be used start a Job that merges changes from the source supporting transient fields as well into the target Working-Set replacing the content of the specified target trackers completely.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"required":["source","target"],"type":"object","properties":{"projectBaselineId":{"type":"number","format":"int32"},"source":{"type":"object","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"target":{"type":"object","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"trackers":{"uniqueItems":true,"type":"array","items":{"required":["tracker"],"type":"object","properties":{"baselineId":{"type":"number","format":"int32"},"cbql":{"type":"string"},"tracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}}}},"transientFields":{"uniqueItems":true,"type":"array","description":"Names of fields marked as transient fields","items":{"type":"string","description":"Names of fields marked as transient fields"}}},"description":"Based on WorkingSetUpdateRequest with additional transient fields support"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/jobs/working-set-update-with-transient-fields",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["migrateAttachments", {
    name: "migrateAttachments",
    description: `An endpoint for migrating attachments from a preconfigured source directory.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","properties":{"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"description":{"type":"string","description":"Description of the entity"},"descriptionFormat":{"type":"string","description":"Description format of the entity","enum":["PlainText","Html","Wiki"]},"files":{"type":"array","description":"List of files to migrate","items":{"type":"object","properties":{"fileName":{"type":"string","description":"File name of the newly created attachment."},"filePath":{"type":"string","description":"The path of the file relative to the configured migration home directory."},"md5sum":{"type":"string","description":"Precomputed MD5 checksum of the file."},"sha512sum":{"type":"string","description":"Precomputed SHA512 checksum of the file."}},"description":"A file to migrate from a remote directory."}},"migrationAction":{"type":"string","description":"Type of action made on the source files.","enum":["MOVE","COPY"]},"modifiedAt":{"type":"string","description":"The date when the entity was modified","format":"date-time"},"modifiedBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"targetItem":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"description":"Request for migrating attachments"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/migration/attachment",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getProjects", {
    name: "getProjects",
    description: `Get projects`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/v3/projects",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["deployConfiguration", {
    name: "deployConfiguration",
    description: `The configuration file needs to be uploaded to codebeamer Documents`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","properties":{"configurationFileId":{"type":"number","description":"Id of a codebeamer document","format":"int32"},"password":{"type":"string","description":"The password to decrypt the uploaded configuration file"},"project":{"type":"object","description":"Reference to a project","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"projectFileId":{"type":"number","description":"Id of a codebeamer document","format":"int32"}},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/projects/deploy",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["searchProjects", {
    name: "searchProjects",
    description: `Search projects by given criteria`,
    inputSchema: {"type":"object","properties":{"requestBody":{"required":["keyName"],"type":"object","properties":{"keyName":{"type":"string","description":"Key name of the project"}},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/projects/search",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getProjectById", {
    name: "getProjectById",
    description: `Get project`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32"}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/v3/projects/{projectId}",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["listAllWorkingSetsOfProject", {
    name: "listAllWorkingSetsOfProject",
    description: `Lists all Working-Sets with minimal information for the given project.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32","description":"The id of the project"},"includeDeleted":{"type":"boolean","description":"The result lists the deleted Working-Sets"}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/v3/projects/{projectId}/all-working-sets",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"includeDeleted","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["export", {
    name: "export",
    description: `Exports the specified project to a zip file`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32"},"requestBody":{"type":"object","properties":{"password":{"type":"string","description":"A password that is used during the project encryption."},"selectedTrackerIds":{"type":"array","description":"If this list is not empty then only the Trackers listed here are exported.","items":{"type":"number","description":"If this list is not empty then only the Trackers listed here are exported.","format":"int32"}},"skipAssociations":{"type":"boolean","description":"If true, then the Associations are not exported","default":false},"skipReports":{"type":"boolean","description":"If true, then the Reports are not exported","default":false},"skipTrackerItems":{"type":"boolean","description":"If true, then the Tracker Items are not exported","default":false},"skipWikiPages":{"type":"boolean","description":"If true, then the Wiki PAges are not exported","default":true}},"description":"The JSON request body."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/projects/{projectId}/content",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getMembersOfProject", {
    name: "getMembersOfProject",
    description: `Get all members of a project`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32"},"page":{"type":"number","format":"int32","default":1,"description":"Index of the result page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in a result page. Max value: 500"}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/v3/projects/{projectId}/members",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getProjectRolesOfMember", {
    name: "getProjectRolesOfMember",
    description: `Get all roles the user has on a project`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32"},"userId":{"type":"number","format":"int32"}},"required":["projectId","userId"]},
    method: "get",
    pathTemplate: "/v3/projects/{projectId}/members/{userId}/permissions",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"userId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackers", {
    name: "getTrackers",
    description: `Get trackers`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32"}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/v3/projects/{projectId}/trackers",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["createTracker", {
    name: "createTracker",
    description: `Create a tracker`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32"},"templateId":{"type":"number","format":"int32","description":"Identifier of the template tracker."},"requestBody":{"required":["defaultShowAncestorItems","defaultShowDescendantItems","deleted","hidden","onlyWorkflowCanCreateNewReferringItem","usingQuickTransitions","usingWorkflow"],"type":"object","properties":{"availableAsTemplate":{"type":"boolean","description":"Indicator if the tracker can be used as a template"},"color":{"type":"string","description":"Color of the tracker"},"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"defaultShowAncestorItems":{"type":"boolean","description":"Default Outline should show Ancestor Items or not"},"defaultShowDescendantItems":{"type":"boolean","description":"Default Outline should show Descendant Items or not"},"deleted":{"type":"boolean","description":"Indicator if the tracker is deleted"},"description":{"type":"string","description":"Description of the entity"},"descriptionFormat":{"type":"string","description":"Description format of the entity","enum":["PlainText","Html","Wiki"]},"hidden":{"type":"boolean","description":"Indicator if the tracker is hidden"},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"keyName":{"type":"string","description":"Keyname of a tracker"},"modifiedAt":{"type":"string","description":"The date when the entity was modified","format":"date-time"},"modifiedBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"name":{"type":"string","description":"Name of the entity"},"onlyWorkflowCanCreateNewReferringItem":{"type":"boolean","description":"If true, then the only way to create new referring items is through workflow actions"},"project":{"type":"object","description":"Reference to a project","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"sharedInWorkingSet":{"type":"boolean","description":"If the tracker is shared in a WorkingSet"},"templateTracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"trackerFieldLayoutSettingsModel":{"type":"object","properties":{"defaultLayout":{"type":"string","description":"defaultLayout of a tracker"},"layouts":{"type":"array","description":"fieldLayoutSettingsModels of a tracker","items":{"type":"object","properties":{"groups":{"type":"array","description":"groupsModels of a fieldLayoutSettingsModel","items":{"type":"object","properties":{"collapsed":{"type":"boolean","description":"collapsed of a groupsModel"},"color":{"type":"string","description":"color of a groupsModel"},"default":{"type":"boolean","description":"default of a groupsModel"},"fields":{"type":"array","description":"fieldModel of a groupsModel","items":{"type":"object","properties":{"field":{"type":"string","description":"field of a fieldModel"},"fieldId":{"type":"number","description":"fieldId of a fieldModel","format":"int32"},"width":{"type":"string","description":"width of a fieldModel"}},"description":"fieldModel of a groupsModel"}},"name":{"type":"string","description":"name of a groupsModel"}},"description":"groupsModels of a fieldLayoutSettingsModel"}},"name":{"type":"string","description":"name of a fieldLayoutSettingsModel"},"showDefault":{"type":"boolean","description":"showDefault of a fieldLayoutSettingsModel"}},"description":"fieldLayoutSettingsModels of a tracker"}},"statusLayout":{"type":"array","description":"statusLayout of a tracker","items":{"type":"object","properties":{"layout":{"type":"string","description":"layout of a statusLayout"},"status":{"type":"string","description":"status of a statusLayout"}},"description":"statusLayout of a tracker"}}},"description":"The field group layouts setting is used when rendering the edit view for a specific tracker item"},"type":{"type":"object","description":"Reference to a tracker type","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"usingQuickTransitions":{"type":"boolean","description":"If true, then every transition will be executed immediately (if possible) without opening an editor for the item"},"usingWorkflow":{"type":"boolean","description":"Should transitions and workflow actions be available in the tracker or not"},"version":{"type":"number","description":"Version of a tracker","format":"int32"}},"description":"Basic properties of a codebeamer tracker"}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/projects/{projectId}/trackers",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"templateId","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["searchAllTrackersInProject", {
    name: "searchAllTrackersInProject",
    description: `Get the list of all trackers in a project`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32"},"requestBody":{"type":"object","properties":{"deleted":{"type":"boolean","description":"True to also show removed trackers."},"hidden":{"type":"boolean","description":"True to also show hidden trackers."},"keyName":{"type":"string","description":"Filter by project key name"},"types":{"type":"array","description":"List of tracker type references, to only show trackers of these types.","items":{"type":"object","description":"Reference to a tracker type","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}}},"description":"The JSON request body."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/projects/{projectId}/trackers/search",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["renderWikiMarkup", {
    name: "renderWikiMarkup",
    description: `Render a wiki page as HTML in a specific context`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32"},"requestBody":{"required":["markup"],"type":"object","properties":{"contextId":{"type":"number","description":"Id of the entity used as rendering context","format":"int32"},"contextVersion":{"type":"number","description":"Version of the entity used as rendering context","format":"int32"},"markup":{"type":"string","description":"Wiki markup to render as HTML"},"renderingContextType":{"type":"string","description":"Type of the entity used as rendering context","enum":["TRACKER_ITEM","WIKI"]}},"description":"Request model to render a wiki page in a specific context"}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/projects/{projectId}/wiki2html",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTopLevelWikiPages", {
    name: "getTopLevelWikiPages",
    description: `Get wiki pages of a project`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32","description":"ID of the project"}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/v3/projects/{projectId}/wikipages",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["listWorkingSetsOfProject", {
    name: "listWorkingSetsOfProject",
    description: `Lists top-level Working-Sets minimal information for the given project.`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32","description":"The id of the project"},"includeDeleted":{"type":"boolean","description":"The result lists the deleted Working-Sets"}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/v3/projects/{projectId}/working-sets",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"includeDeleted","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["createReport", {
    name: "createReport",
    description: `Create a report`,
    inputSchema: {"type":"object","properties":{"requestBody":{"required":["cbQl","columns","description","name"],"type":"object","properties":{"addedPermissions":{"type":"array","description":"Access permissions for the report.","items":{"required":["access","project","role"],"type":"object","properties":{"access":{"type":"string","description":"Access level","enum":["NONE","READ","WRITE","READ_WRITE"]},"project":{"type":"object","description":"Reference to a project","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"role":{"type":"object","description":"Reference to a role","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"description":"Access permissions for the report."}},"cbQl":{"type":"string","description":"CbQL query string of the report."},"columns":{"type":"array","description":"Column definitions.","items":{"required":["columnIndex","field"],"type":"object","properties":{"columnIndex":{"type":"number","description":"Index of the column in the report table.","format":"int32"},"columnWidthPercentage":{"type":"number","description":"Width of the column in percentage.","format":"double"},"field":{"type":"object","description":"Reference to a field of a specific tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","readOnly":true,"items":{"type":"string","description":"The names of a shared fields assigned to the field.","readOnly":true}},"trackerId":{"type":"integer","description":"Id of the tracker","format":"int32","example":1000}}}]}},"description":"Settings for a resizeable column definition."}},"description":{"type":"string","description":"Description of the report."},"name":{"type":"string","description":"Name of the report."},"reportId":{"type":"number","description":"Id of a report","format":"int32"},"showAllChildren":{"type":"boolean","description":"Indicator to ability to collapse/expand all child items."},"showAncestors":{"type":"boolean","description":"Indicator to show the ancestors of a result item."},"showDescendants":{"type":"boolean","description":"Indicator to show the descendants of a result item."}},"description":"Settings for a simple report."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/reports",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateReport", {
    name: "updateReport",
    description: `Update report settings`,
    inputSchema: {"type":"object","properties":{"reportId":{"type":"number","format":"int32","description":"Id of a report"},"requestBody":{"required":["cbQl","columns","description","name"],"type":"object","properties":{"addedPermissions":{"type":"array","description":"Access permissions for the report.","items":{"required":["access","project","role"],"type":"object","properties":{"access":{"type":"string","description":"Access level","enum":["NONE","READ","WRITE","READ_WRITE"]},"project":{"type":"object","description":"Reference to a project","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"role":{"type":"object","description":"Reference to a role","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"description":"Access permissions for the report."}},"cbQl":{"type":"string","description":"CbQL query string of the report."},"columns":{"type":"array","description":"Column definitions.","items":{"required":["columnIndex","field"],"type":"object","properties":{"columnIndex":{"type":"number","description":"Index of the column in the report table.","format":"int32"},"columnWidthPercentage":{"type":"number","description":"Width of the column in percentage.","format":"double"},"field":{"type":"object","description":"Reference to a field of a specific tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","readOnly":true,"items":{"type":"string","description":"The names of a shared fields assigned to the field.","readOnly":true}},"trackerId":{"type":"integer","description":"Id of the tracker","format":"int32","example":1000}}}]}},"description":"Settings for a resizeable column definition."}},"description":{"type":"string","description":"Description of the report."},"name":{"type":"string","description":"Name of the report."},"reportId":{"type":"number","description":"Id of a report","format":"int32"},"showAllChildren":{"type":"boolean","description":"Indicator to ability to collapse/expand all child items."},"showAncestors":{"type":"boolean","description":"Indicator to show the ancestors of a result item."},"showDescendants":{"type":"boolean","description":"Indicator to show the descendants of a result item."}},"description":"Settings for a simple report."}},"required":["reportId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/reports/{reportId}",
    executionParameters: [{"name":"reportId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getReportItemsById", {
    name: "getReportItemsById",
    description: `Get a report items by id of the report`,
    inputSchema: {"type":"object","properties":{"reportId":{"type":"number","format":"int32","description":"Id of a report"},"page":{"type":"number","format":"int32","default":1,"description":"Index of a report page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items a report page. Max value: 500"}},"required":["reportId"]},
    method: "get",
    pathTemplate: "/v3/reports/{reportId}/items",
    executionParameters: [{"name":"reportId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getReportById", {
    name: "getReportById",
    description: `Get a report results by id of the report`,
    inputSchema: {"type":"object","properties":{"reportId":{"type":"number","format":"int32","description":"Id of a report"},"page":{"type":"number","format":"int32","default":1,"description":"Index of a report page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items a report page. Max value: 500"}},"required":["reportId"]},
    method: "get",
    pathTemplate: "/v3/reports/{reportId}/results",
    executionParameters: [{"name":"reportId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getRoles", {
    name: "getRoles",
    description: `Get roles`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/v3/roles",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getRole", {
    name: "getRole",
    description: `Get role`,
    inputSchema: {"type":"object","properties":{"roleId":{"type":"number","format":"int32"}},"required":["roleId"]},
    method: "get",
    pathTemplate: "/v3/roles/{roleId}",
    executionParameters: [{"name":"roleId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["findStreams", {
    name: "findStreams",
    description: `List all streams (including hidden ones) or list streams which matches the given criteria.`,
    inputSchema: {"type":"object","properties":{"fuzzyName":{"type":"string","description":"If specified, only the streams are returned which contains the given substring in the name. Ignores casing and whitespace."},"isHidden":{"type":"boolean","description":"If not specified, both hidden and visible streams are returned. If specified only the visible (False) or hidden (True) streams will be returned."},"projectId":{"type":"number","format":"int32","description":"If specified, only those streams are returned which contains the given project."},"trackerItemId":{"type":"number","format":"int32","description":"If specified, only those streams are returned which contains the given tracker item."},"page":{"type":"number","format":"int32","description":"Pagination, page index."},"pageSize":{"type":"number","format":"int32","description":"Pagination, page size."}},"required":["page","pageSize"]},
    method: "get",
    pathTemplate: "/v3/streams",
    executionParameters: [{"name":"fuzzyName","in":"query"},{"name":"isHidden","in":"query"},{"name":"projectId","in":"query"},{"name":"trackerItemId","in":"query"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getInitialStreamId", {
    name: "getInitialStreamId",
    description: `Finds and returns the Initial Stream ID`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/v3/streams/initial",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["createStream", {
    name: "createStream",
    description: `Creates a new empty stream and if the sourceStreamId is present starts a new background job to extend the stream to include all projects and trackers from the specified source stream.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"required":["color","name"],"type":"object","properties":{"color":{"type":"string","description":"Stream Color"},"description":{"type":"string","description":"Stream Description"},"isSourceStreamChecked":{"type":"boolean","description":"Source Stream Checkbox is checked"},"name":{"type":"string","description":"Stream Name"},"sourceStreamId":{"type":"number","description":"Source Stream ID","format":"int32"}},"description":"Details of the new stream"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/streams/stream",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["findStreamById", {
    name: "findStreamById",
    description: `Get a stream by ID`,
    inputSchema: {"type":"object","properties":{"streamId":{"type":"number","format":"int32","description":"Stream identifier"},"retrieveHidden":{"type":"boolean","description":"If provided it overrides the default visibility of hidden streams specified in the user settings."}},"required":["streamId"]},
    method: "get",
    pathTemplate: "/v3/streams/{streamId}",
    executionParameters: [{"name":"streamId","in":"path"},{"name":"retrieveHidden","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateStream", {
    name: "updateStream",
    description: `Update an existing Stream`,
    inputSchema: {"type":"object","properties":{"streamId":{"type":"number","format":"int32","description":"Stream identifier"},"requestBody":{"required":["color","isHidden","name"],"type":"object","properties":{"color":{"type":"string","description":"Stream Color"},"description":{"type":"string","description":"Stream Description"},"isHidden":{"type":"boolean","description":"Stream Hidden flag"},"name":{"type":"string","description":"Stream Name"}},"description":"Details of the stream update"}},"required":["streamId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/streams/{streamId}",
    executionParameters: [{"name":"streamId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getDescendantStreams", {
    name: "getDescendantStreams",
    description: `Get descendant streams`,
    inputSchema: {"type":"object","properties":{"streamId":{"type":"number","format":"int32","description":"Stream identifier"},"retrieveHidden":{"type":"boolean","description":"If provided it overrides the default visibility of hidden streams specified in the user settings."}},"required":["streamId"]},
    method: "get",
    pathTemplate: "/v3/streams/{streamId}/descendants",
    executionParameters: [{"name":"streamId","in":"path"},{"name":"retrieveHidden","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["findStreamDetailsById", {
    name: "findStreamDetailsById",
    description: `Get a stream details by ID`,
    inputSchema: {"type":"object","properties":{"streamId":{"type":"number","format":"int32","description":"Stream identifier"},"retrieveHidden":{"type":"boolean","description":"If provided it overrides the default visibility of hidden streams specified in the user settings."}},"required":["streamId"]},
    method: "get",
    pathTemplate: "/v3/streams/{streamId}/details",
    executionParameters: [{"name":"streamId","in":"path"},{"name":"retrieveHidden","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getProjectIdsInStream", {
    name: "getProjectIdsInStream",
    description: `Get the IDs of projects which are in the given stream`,
    inputSchema: {"type":"object","properties":{"streamId":{"type":"number","format":"int32","description":"Stream identifier"}},"required":["streamId"]},
    method: "get",
    pathTemplate: "/v3/streams/{streamId}/projects",
    executionParameters: [{"name":"streamId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["addProjectToStream", {
    name: "addProjectToStream",
    description: `Add a project to the stream`,
    inputSchema: {"type":"object","properties":{"streamId":{"type":"number","format":"int32","description":"Stream identifier"},"requestBody":{"required":["addAllTrackers","projectId","sourceStreamId"],"type":"object","properties":{"addAllTrackers":{"type":"boolean","description":"Add all Trackers from the selected Projects"},"baselineId":{"type":"number","description":"Baseline ID, optional","format":"int32"},"projectId":{"type":"number","description":"Project ID","format":"int32"},"sourceStreamId":{"type":"number","description":"Source Stream ID","format":"int32"}},"description":"Project to add"}},"required":["streamId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/streams/{streamId}/projects",
    executionParameters: [{"name":"streamId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getProjectsInStream", {
    name: "getProjectsInStream",
    description: `Get detailed info about the projects in the given stream`,
    inputSchema: {"type":"object","properties":{"streamId":{"type":"number","format":"int32","description":"Stream identifier"},"fuzzyProjectNameFilter":{"type":"string","description":"Optional fuzzy name filter (ignores whitespace and casing, partial matches also returned)"}},"required":["streamId"]},
    method: "get",
    pathTemplate: "/v3/streams/{streamId}/projects/details",
    executionParameters: [{"name":"streamId","in":"path"},{"name":"fuzzyProjectNameFilter","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["addTrackersToStream", {
    name: "addTrackersToStream",
    description: `Add trackers to the stream`,
    inputSchema: {"type":"object","properties":{"streamId":{"type":"number","format":"int32"},"projectId":{"type":"number","format":"int32"},"requestBody":{"required":["selectedTrackerIds"],"type":"object","properties":{"selectedBaselines":{"type":"object","additionalProperties":{"type":"integer","description":"Selected baselines","format":"int32"},"description":"Selected baselines"},"selectedTrackerIds":{"type":"array","description":"Selected tracker IDs","items":{"type":"number","description":"Selected tracker IDs","format":"int32"}},"sharedTrackerIds":{"type":"array","description":"Shared tracker Ids","items":{"type":"number","description":"Shared tracker Ids","format":"int32"}}},"description":"Identifies the trackers to add to the stream"}},"required":["streamId","projectId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/streams/{streamId}/projects/{projectId}/trackers",
    executionParameters: [{"name":"streamId","in":"path"},{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerVariantInStream", {
    name: "getTrackerVariantInStream",
    description: `Get trackers which are in the given stream`,
    inputSchema: {"type":"object","properties":{"streamId":{"type":"number","format":"int32"},"trackerId":{"type":"number","format":"int32"}},"required":["streamId","trackerId"]},
    method: "get",
    pathTemplate: "/v3/streams/{streamId}/trackers/{trackerId}/variant",
    executionParameters: [{"name":"streamId","in":"path"},{"name":"trackerId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getAuditPermissions", {
    name: "getAuditPermissions",
    description: `Get audit permission entries`,
    inputSchema: {"type":"object","properties":{"page":{"type":"number","format":"int32","default":1,"description":"Index of page, starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items per page. Max value: 100"},"requestBody":{"required":["eventTypes"],"type":"object","properties":{"duration":{"type":"string","description":"duration","enum":["TODAY","THIS_WEEK","THIS_MONTH","THIS_QUARTER","THIS_YEAR","YESTERDAY","LAST_2_DAYS","LAST_5_DAYS","LAST_7_DAYS","LAST_10_DAYS","LAST_30_DAYS","LAST_365_DAYS"]},"eventTypes":{"type":"array","description":"Event type names","items":{"type":"string","description":"Event type names"}},"fromDate":{"type":"string","description":"From date","format":"date-time"},"projectIds":{"type":"array","description":"Project ids","items":{"type":"number","description":"Project ids","format":"int32"}},"showChanges":{"type":"boolean","description":"Show changes","default":false},"targetUserNames":{"type":"array","description":"Target user names","items":{"type":"string","description":"Target user names"}},"toDate":{"type":"string","description":"To date","format":"date-time"},"trackerIds":{"type":"array","description":"Tracker ids","items":{"type":"number","description":"Tracker ids","format":"int32"}},"userNames":{"type":"array","description":"User names","items":{"type":"string","description":"User names"}}},"description":"Request model for audit permissions"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/sysadmin/audit/permissions",
    executionParameters: [{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getSystemStatus", {
    name: "getSystemStatus",
    description: `Get system maintenance status`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/v3/system/maintenance",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["setSystemStatus", {
    name: "setSystemStatus",
    description: `Set system maintenance status`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","properties":{"properties":{"required":["loginErrorText","loginText","notificationText","slogan","welcomeText"],"type":["object","null"],"properties":{"loginErrorText":{"type":"string","description":"Error text shown during login"},"loginText":{"type":"string","description":"Text shown on login screen"},"notificationText":{"type":"string","description":"Notification text"},"slogan":{"type":"string","description":"Slogan text"},"welcomeText":{"type":"string","description":"Welcome text"}},"description":"Extra properties for maintenance mode"},"systemMode":{"type":"string","description":"System mode","enum":["NORMAL","MAINTENANCE"]}},"description":"Basic properties of maintenance mode"}},"required":["requestBody"]},
    method: "put",
    pathTemplate: "/v3/system/maintenance",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["autoApplyStepReuses", {
    name: "autoApplyStepReuses",
    description: `Find duplicate TestSteps in a set of TestCases and converting duplicates to Reuses`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","properties":{"scanTestCaseLibraries":{"type":"boolean","description":"If it scans/finds the duplicate Steps in Test Case libraries of the user? Note: that only Reusable Steps will be reused from these libraries!"},"testCases":{"type":"array","description":"The Test Cases to find the duplicated steps inside: if these Test Cases has duplicated Steps these will be converted to Step-Reuses.","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}}},"description":"Specifies which Test Cases are checked for duplicate Steps"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/testcases/autoApplyStepReuses",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateTestRunResult", {
    name: "updateTestRunResult",
    description: `Update result of a Test Run. `,
    inputSchema: {"type":"object","properties":{"testRunId":{"type":"number","format":"int32"},"requestBody":{"required":["updateRequestModels"],"type":"object","properties":{"parentResultPropagation":{"type":"boolean","description":"The propagation of the result is enabled for parent Test Run or not","default":true},"updateRequestModels":{"type":"array","description":"List of update Test Case run request models","items":{"required":["result","testCaseReference"],"type":"object","properties":{"conclusion":{"type":"string","description":"Optional conclusion text"},"customFields":{"type":"array","description":"Optional field values to set on the Test Run","items":{"required":["type"],"type":"object","properties":{"fieldId":{"type":"number","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId."},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}}},"reportedBugReferences":{"type":"array","description":"Optional reference list of Bugs attached to the Test result","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"result":{"type":"string","description":"Result of the test case","enum":["PASSED","FAILED","BLOCKED","NOT_APPLICABLE"]},"runTime":{"type":"number","description":"Optional runtime in seconds","format":"int32"},"testCaseReference":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"description":"Request model to update Test Run's result for a Test Case"}}},"description":"Model to contain Test Case run update request models"}},"required":["testRunId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/testruns/{testRunId}",
    executionParameters: [{"name":"testRunId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTraceabilityInitialItemIds", {
    name: "getTraceabilityInitialItemIds",
    description: `Get traceability initial ids!`,
    inputSchema: {"type":"object","properties":{"pageSize":{"type":"number","format":"int32","description":"Number of items in a result page."},"pageNo":{"type":"number","format":"int32","description":"Index of the result page."},"requestBody":{"required":["cbQL"],"type":"object","properties":{"cbQL":{"type":"string","description":"cbQL"},"historyBaselineId":{"type":"number","description":"Snapshot view of given baseline","format":"int32"},"historyDate":{"type":"string","description":"Snapshot view of given date","format":"date-time"},"showAncestorItems":{"type":"boolean","description":"Show ancestor items","default":false},"showDescendantItems":{"type":"boolean","description":"Show descendant items","default":false}},"description":"Settings to filter items"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/traceability/items",
    executionParameters: [{"name":"pageSize","in":"query"},{"name":"pageNo","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTraceabilityLevelItemIds", {
    name: "getTraceabilityLevelItemIds",
    description: `Get traceability item ids!`,
    inputSchema: {"type":"object","properties":{"itemsOnLevel":{"type":"number","format":"int32","description":"Number of items per level."},"itemsFromPreviousItem":{"type":"number","format":"int32","description":"Number of items per item."},"requestBody":{"required":["cbQL"],"type":"object","properties":{"cbQL":{"type":"string","description":"cbQL"},"foldersAndInformation":{"type":"boolean","description":"Show folders and information","default":false},"historyBaselineId":{"type":"number","description":"History Baseline Id - Snapshot view of the given baseline","format":"int32"},"historyDate":{"type":"string","description":"History Date - Snapshot view of the given date","format":"date-time"},"incomingAssociation":{"type":"boolean","description":"Show incoming association","default":true},"incomingReference":{"type":"boolean","description":"Show incoming references","default":true},"outgoingAssociation":{"type":"boolean","description":"Show outgoing association","default":true},"outgoingReference":{"type":"boolean","description":"Show outgoing references","default":true},"previousLevelItems":{"type":"array","description":"Previous Level Items","items":{"type":"object","properties":{"commonItemId":{"type":"number","description":"Tracker common item id","format":"int32"},"id":{"type":"number","description":"Tracker item id","format":"int32"},"version":{"type":"number","description":"Tracker item version","format":"int32"}},"description":"Tracker item revision identifier"}},"showTestStepReferences":{"type":"boolean"}},"description":"Traceability level filter"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/traceability/relations",
    executionParameters: [{"name":"itemsOnLevel","in":"query"},{"name":"itemsFromPreviousItem","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["postTrackerConfiguration", {
    name: "postTrackerConfiguration",
    description: `Create or update tracker configuration`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","properties":{"basicInformation":{"type":"object","properties":{"alwaysUseQuickTransitions":{"type":"boolean"},"color":{"type":"string"},"defaultLayout":{"type":"string","enum":["TABLE","DOCUMENT","DOCUMENT_EDIT","CARDBOARD","DASHBOARD"]},"description":{"type":"string"},"hidden":{"type":"boolean"},"inboxId":{"type":"number","format":"int32"},"issueTypeId":{"type":"number","format":"int32"},"itemCountVisibility":{"type":"boolean"},"key":{"type":"string"},"locked":{"type":"boolean"},"name":{"type":"string"},"onlyWorkflowActionsCanCreateNewReferringItems":{"type":"boolean"},"projectId":{"type":"number","format":"int32"},"recentReferringTrackersMenu":{"type":"boolean"},"referenceVisibility":{"type":"boolean"},"sharedInWorkingSets":{"type":"boolean"},"showAncestorItems":{"type":"boolean"},"showDescendantItems":{"type":"boolean"},"template":{"type":"boolean"},"templateId":{"type":"number","format":"int32"},"trackerId":{"type":"number","format":"int32"},"workflowIsActive":{"type":"boolean"}},"description":"General Tracker information."},"fields":{"type":"array","items":{"type":"object","properties":{"aggregationRule":{"type":"string","description":"The Aggregation Rule for a specific Field.","enum":["MINIMUM","MAXIMUM","UNION","INTERSECTION","SUM_TOTAL","AVERAGE"]},"allowedValuesInStatuses":{"type":"object","additionalProperties":{"type":"string"}},"bidirectionalSuspect":{"type":"boolean"},"choiceOptionSetting":{"required":["type"],"type":"object","properties":{"type":{"type":"string"}},"description":"Describes a Choice Option field configuration.","discriminator":{"propertyName":"type","mapping":{"CHOICE_DOCUMENTS":"#/components/schemas/ChoiceDocuments","CHOICE_OPTIONS":"#/components/schemas/ChoiceOptions","CHOICE_PROJECTS":"#/components/schemas/ChoiceProjects","CHOICE_REPOSITORIES":"#/components/schemas/ChoiceRepositories","CHOICE_TRACKERS":"#/components/schemas/ChoiceTrackers","CHOICE_USERS":"#/components/schemas/ChoiceUsers","CHOICE_WORK_CONFIG_ITEMS":"#/components/schemas/ChoiceWorkConfigItems","MEMBERS":"#/components/schemas/ChoiceMembers"}}},"computedAs":{"type":"string"},"computedFieldReferences":{"type":"array","items":{"type":"object","properties":{"direction":{"type":"string","enum":["UP","DOWN"]},"referredFieldId":{"type":"number","format":"int32"},"referredFieldTrackerId":{"type":"number","format":"int32"},"referredTrackerId":{"type":"number","format":"int32"}},"description":"Describes the Computed Field Reference configuration."}},"dateFieldSettings":{"type":"object","properties":{"displayDay":{"type":"boolean"},"displayMonth":{"type":"boolean"},"displayTime":{"type":"boolean"},"displayYear":{"type":"boolean"}},"description":"Describes the settings of a date type Field."},"defaultValuesInStatuses":{"type":"object","additionalProperties":{"type":"string"}},"dependency":{"type":"object","properties":{"dependentFieldId":{"type":"number","format":"int32"},"valueCombinations":{"type":"object","additionalProperties":{"type":"string"}}},"description":"Describes a Field Dependency configuration."},"description":{"type":"string"},"digits":{"type":"number","format":"int32"},"distributionRule":{"type":"string","description":"The Distribution Rule of a specific Field.","enum":["SET","DEFAULT","LEAST","GREATEST","SUBSET","SUPERSET","CLOSE_RECURSIVELY","CLOSE_RESTRICTED"]},"globalTypeIds":{"type":"array","items":{"type":"number","format":"int32"}},"height":{"type":"number","format":"int32"},"hidden":{"type":"boolean"},"hideIfFormula":{"type":"string"},"hideIfFormulaSameAsFieldId":{"type":"number","format":"int32"},"label":{"type":"string"},"listable":{"type":"boolean"},"mandatory":{"type":"boolean"},"mandatoryExceptInStatus":{"type":"array","items":{"type":"number","format":"int32"}},"mandatoryIfFormula":{"type":"string"},"mandatoryIfFormulaSameAsFieldId":{"type":"number","format":"int32"},"maxValue":{"type":"string"},"minValue":{"type":"string"},"multipleSelection":{"type":"boolean"},"newLine":{"type":"boolean"},"omitMerge":{"type":"boolean"},"omitSuspectedWhenChange":{"type":"boolean"},"permission":{"required":["type"],"type":"object","properties":{"type":{"type":"string"}},"description":"Describes the permission of a Tracker Field.","discriminator":{"propertyName":"type","mapping":{"PER_STATUS":"#/components/schemas/PerStatusFieldPermission","SAME_AS":"#/components/schemas/SameAsFieldPermission","SINGLE":"#/components/schemas/SingleFieldPermission","UNRESTRICTED":"#/components/schemas/UnrestrictedFieldPermission"}}},"position":{"type":"number","format":"int32"},"propagateDependencies":{"type":"boolean"},"propagateSuspect":{"type":"boolean"},"referenceId":{"type":"number","format":"int32"},"reversedSuspect":{"type":"boolean"},"serviceDeskField":{"type":"object","properties":{"description":{"type":"string"},"label":{"type":"string"}},"description":"Describes the Service Desk related configurations."},"span":{"type":"number","format":"int32"},"title":{"type":"string"},"typeId":{"type":"number","format":"int32"},"union":{"type":"boolean"},"width":{"type":"number","format":"int32"}},"description":"This model represents a whole Tracker Field configuration."}}},"description":"This model represents the whole Tracker configuration."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/tracker/configuration",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerConfiguration", {
    name: "getTrackerConfiguration",
    description: `Get tracker configuration`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/tracker/{trackerId}/configuration",
    executionParameters: [{"name":"trackerId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerPermissions", {
    name: "getTrackerPermissions",
    description: `Get available tracker permissions`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/v3/trackers/permissions",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerPermission", {
    name: "getTrackerPermission",
    description: `Get the immutable definition of a tracker permission`,
    inputSchema: {"type":"object","properties":{"trackerPermissionId":{"type":"number","format":"int32"}},"required":["trackerPermissionId"]},
    method: "get",
    pathTemplate: "/v3/trackers/permissions/{trackerPermissionId}",
    executionParameters: [{"name":"trackerPermissionId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["createExternalScmRepository", {
    name: "createExternalScmRepository",
    description: `Create an external scm repository item`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32","description":"CB project id"},"requestBody":{"required":["enablePatchSynchronization","name","ownerName","remoteApiUrl","repositoryName","scmType"],"type":"object","properties":{"accessTokenId":{"type":"number","description":"Id of already created token for external SCM provider API. Required in case when old access token should be used","format":"int32"},"accessTokenName":{"type":"string","description":"Name of new access token for external SCM provider API. Required in case when new access token item should be created"},"accessTokenValue":{"type":"string","description":"Value of new access token for external SCM provider API. Required in case when new access token item should be created"},"enablePatchSynchronization":{"type":"boolean","description":"Enable or disable patch synchronization"},"name":{"type":"string","description":"Name of new CB external SCM repository"},"ownerName":{"type":"string","description":"Owner name or organization name of external SCM provider repository"},"projectName":{"type":"string","description":"Project name of external SCM provider repository"},"remoteApiUrl":{"type":"string","description":"Base API URL of external SCM provider"},"repositoryName":{"type":"string","description":"Repository name on external SCM provider's side"},"scmType":{"type":"string","description":"External SCM provider"},"secretId":{"type":"number","description":"Id of already created Secret for external SCM provider API","format":"int32"}},"description":"Basic properties required for codebeamer external scm repository item"}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/trackers/projects/{projectId}/repository",
    executionParameters: [{"name":"projectId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateExternalScmRepository", {
    name: "updateExternalScmRepository",
    description: `Update an external scm repository item`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32","description":"CB project id"},"repositoryId":{"type":"number","format":"int32","description":"CB repository id"},"requestBody":{"required":["enablePatchSynchronization","name","ownerName","remoteApiUrl","repositoryName","scmType"],"type":"object","properties":{"accessTokenId":{"type":"number","description":"Id of already created token for external SCM provider API. Required in case when old access token should be used","format":"int32"},"accessTokenName":{"type":"string","description":"Name of new access token for external SCM provider API. Required in case when new access token item should be created"},"accessTokenValue":{"type":"string","description":"Value of new access token for external SCM provider API. Required in case when new access token item should be created"},"enablePatchSynchronization":{"type":"boolean","description":"Enable or disable patch synchronization"},"name":{"type":"string","description":"Name of new CB external SCM repository"},"ownerName":{"type":"string","description":"Owner name or organization name of external SCM provider repository"},"projectName":{"type":"string","description":"Project name of external SCM provider repository"},"remoteApiUrl":{"type":"string","description":"Base API URL of external SCM provider"},"repositoryName":{"type":"string","description":"Repository name on external SCM provider's side"},"scmType":{"type":"string","description":"External SCM provider"},"secretId":{"type":"number","description":"Id of already created Secret for external SCM provider API","format":"int32"}},"description":"Basic properties required for codebeamer external scm repository item"}},"required":["projectId","repositoryId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/trackers/projects/{projectId}/repository/{repositoryId}",
    executionParameters: [{"name":"projectId","in":"path"},{"name":"repositoryId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["listTrackerTree", {
    name: "listTrackerTree",
    description: `List tracker tree`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32"},"workingSetId":{"type":"number","format":"int32"},"revision":{"type":"number","format":"int32"}},"required":["projectId"]},
    method: "get",
    pathTemplate: "/v3/trackers/tree",
    executionParameters: [{"name":"projectId","in":"query"},{"name":"workingSetId","in":"query"},{"name":"revision","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateTrackerTree", {
    name: "updateTrackerTree",
    description: `Update tracker tree`,
    inputSchema: {"type":"object","properties":{"projectId":{"type":"number","format":"int32"},"workingSetId":{"type":"number","format":"int32"},"requestBody":{"type":"array","items":{"type":"object","properties":{"children":{"type":"array","items":{"type":"object"}},"isFolder":{"type":"boolean","description":"Folder or tracker"},"text":{"type":"string","description":"Name of a folder"},"trackerId":{"type":"number","description":"Id of the tracker","format":"int32"}},"description":"Properties of tracker tree"},"description":"The JSON request body."}},"required":["projectId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/trackers/tree/update",
    executionParameters: [{"name":"projectId","in":"query"},{"name":"workingSetId","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerTypes", {
    name: "getTrackerTypes",
    description: `Get the list of tracker types`,
    inputSchema: {"type":"object","properties":{"outline":{"type":"string","enum":["ENABLED","DISABLED","ANY"],"default":"ANY","description":"Outline is enabled, disabled or any(no filtering will be applied)."}}},
    method: "get",
    pathTemplate: "/v3/trackers/types",
    executionParameters: [{"name":"outline","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerType", {
    name: "getTrackerType",
    description: `Get the immutable definition of a tracker type`,
    inputSchema: {"type":"object","properties":{"trackerTypeId":{"type":"number","format":"int32"}},"required":["trackerTypeId"]},
    method: "get",
    pathTemplate: "/v3/trackers/types/{trackerTypeId}",
    executionParameters: [{"name":"trackerTypeId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["uploadAutomatedTestResults", {
    name: "uploadAutomatedTestResults",
    description: `Upload large amount of automated test case run results into a single test run. This process may take a while, please check your proxy settings to prevent timeout.`,
    inputSchema: {"type":"object","properties":{"testRunTrackerId":{"type":"number","format":"int32"},"requestBody":{"required":["testCaseTrackerId","testResults"],"type":"object","properties":{"createNonExistentTestCases":{"type":"boolean","description":"Flag to create new test cases from testResults if necessary"},"testCaseTrackerId":{"type":"number","description":"ID of the Test Case tracker","format":"int32"},"testResults":{"type":"array","description":"Test case results to include into the test run","items":{"required":["name","result"],"type":"object","properties":{"conclusion":{"type":"string","description":"Optional Test Case Run conclusion"},"description":{"type":"string","description":"Description of the Test Case"},"groupName":{"type":"string","description":"Group name of the Test Case"},"name":{"type":"string","description":"Name of the Test Case"},"result":{"type":"string","description":"Result of the test case","enum":["PASSED","FAILED","BLOCKED","NOT_APPLICABLE"]},"runTime":{"type":"number","description":"Optional runtime in seconds","format":"int32"}},"description":"Request model to create a test run from test case"}},"testRunModel":{"type":"object","properties":{"accruedMillis":{"type":"number","description":"Accrued work time of a tracker item in milliseconds","format":"int64"},"angularIcon":{"type":"string","description":"Angular icon for the tracker item"},"areas":{"type":"array","description":"Areas of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"assignedAt":{"type":"string","description":"Assignee date of a tracker item","format":"date-time"},"assignedTo":{"type":"array","description":"Assignees of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"categories":{"type":"array","description":"Categories of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"children":{"type":"array","description":"Children of a tracker item","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"closedAt":{"type":"string","description":"Close date of a tracker item","format":"date-time"},"comments":{"type":"array","description":"Comment in the tracker item","items":{"type":"object","description":"Reference to a comment of a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"commonItemId":{"type":"number","description":"Id shared by the branched versions of the tracker item","format":"int32"},"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"customFields":{"type":"array","description":"Custom field of a tracker item","items":{"required":["type"],"type":"object","properties":{"fieldId":{"type":"number","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId."},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}}},"description":{"type":"string","description":"Description of the entity"},"descriptionFormat":{"type":"string","description":"Description format of the entity","enum":["PlainText","Html","Wiki"]},"endDate":{"type":"string","description":"End date of a tracker item","format":"date-time"},"estimatedMillis":{"type":"number","description":"Estimated work time of a tracker item in milliseconds","format":"int64"},"formality":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"iconColor":{"type":"string","description":"Color of the tracker item icon"},"iconUrl":{"type":"string","description":"Url of the tracker item icon"},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"modifiedAt":{"type":"string","description":"The date when the entity was modified","format":"date-time"},"modifiedBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"name":{"type":"string","description":"Name of the entity"},"ordinal":{"type":"number","description":"Ordinal of a tracker item","format":"int32"},"owners":{"type":"array","description":"Owners of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"parent":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]},"platforms":{"type":"array","description":"Platforms of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"priority":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"releaseMethod":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"resolutions":{"type":"array","description":"Resolutions of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"severities":{"type":"array","description":"Severities of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"spentMillis":{"type":"number","description":"Spent work time of a tracker item in milliseconds","format":"int64"},"startDate":{"type":"string","description":"Start date of a tracker item","format":"date-time"},"status":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"storyPoints":{"type":"number","description":"Story points of a tracker item","format":"int32"},"subjects":{"type":"array","description":"Subjects of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"tags":{"type":"array","description":"Tags of the tracker item","items":{"type":"object","properties":{"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"hidden":{"type":"boolean","description":"Whether the label is hidden or not"},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"privateLabel":{"type":"boolean","description":"Whether the label is private or not"}},"description":"Label that is used for entities like tags."}},"teams":{"type":"array","description":"Teams of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"tracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"typeName":{"type":"string","description":"Type name of a tracker item"},"version":{"type":"number","description":"Version of a tracker item","format":"int32"},"versions":{"type":"array","description":"Versions of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}}},"description":"Basic properties of a codebeamer tracker item"}},"description":"Request model to create a test run from test case runs"}},"required":["testRunTrackerId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/trackers/{testRunTrackerId}/automatedtestruns",
    executionParameters: [{"name":"testRunTrackerId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["createTestRunForTestCase", {
    name: "createTestRunForTestCase",
    description: `For multiple test sets please use trackers/{testRunTrackerId}/testruns/generatefromtestset endpoint.`,
    inputSchema: {"type":"object","properties":{"testRunTrackerId":{"type":"number","format":"int32"},"requestBody":{"type":"object","properties":{"runOnlyAcceptedTestCases":{"type":"boolean","description":"Generate Test Runs only from accepted Test Cases.","default":false},"testCaseIds":{"type":"array","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"testCaseRefs":{"type":"array","description":"Test case ids to include into the test run","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"testRunModel":{"type":"object","properties":{"accruedMillis":{"type":"number","description":"Accrued work time of a tracker item in milliseconds","format":"int64"},"angularIcon":{"type":"string","description":"Angular icon for the tracker item"},"areas":{"type":"array","description":"Areas of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"assignedAt":{"type":"string","description":"Assignee date of a tracker item","format":"date-time"},"assignedTo":{"type":"array","description":"Assignees of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"categories":{"type":"array","description":"Categories of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"children":{"type":"array","description":"Children of a tracker item","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"closedAt":{"type":"string","description":"Close date of a tracker item","format":"date-time"},"comments":{"type":"array","description":"Comment in the tracker item","items":{"type":"object","description":"Reference to a comment of a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"commonItemId":{"type":"number","description":"Id shared by the branched versions of the tracker item","format":"int32"},"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"customFields":{"type":"array","description":"Custom field of a tracker item","items":{"required":["type"],"type":"object","properties":{"fieldId":{"type":"number","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId."},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}}},"description":{"type":"string","description":"Description of the entity"},"descriptionFormat":{"type":"string","description":"Description format of the entity","enum":["PlainText","Html","Wiki"]},"endDate":{"type":"string","description":"End date of a tracker item","format":"date-time"},"estimatedMillis":{"type":"number","description":"Estimated work time of a tracker item in milliseconds","format":"int64"},"formality":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"iconColor":{"type":"string","description":"Color of the tracker item icon"},"iconUrl":{"type":"string","description":"Url of the tracker item icon"},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"modifiedAt":{"type":"string","description":"The date when the entity was modified","format":"date-time"},"modifiedBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"name":{"type":"string","description":"Name of the entity"},"ordinal":{"type":"number","description":"Ordinal of a tracker item","format":"int32"},"owners":{"type":"array","description":"Owners of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"parent":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]},"platforms":{"type":"array","description":"Platforms of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"priority":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"releaseMethod":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"resolutions":{"type":"array","description":"Resolutions of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"severities":{"type":"array","description":"Severities of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"spentMillis":{"type":"number","description":"Spent work time of a tracker item in milliseconds","format":"int64"},"startDate":{"type":"string","description":"Start date of a tracker item","format":"date-time"},"status":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"storyPoints":{"type":"number","description":"Story points of a tracker item","format":"int32"},"subjects":{"type":"array","description":"Subjects of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"tags":{"type":"array","description":"Tags of the tracker item","items":{"type":"object","properties":{"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"hidden":{"type":"boolean","description":"Whether the label is hidden or not"},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"privateLabel":{"type":"boolean","description":"Whether the label is private or not"}},"description":"Label that is used for entities like tags."}},"teams":{"type":"array","description":"Teams of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"tracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"typeName":{"type":"string","description":"Type name of a tracker item"},"version":{"type":"number","description":"Version of a tracker item","format":"int32"},"versions":{"type":"array","description":"Versions of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}}},"description":"Basic properties of a codebeamer tracker item"},"testSetIds":{"type":"array","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"testSetRefs":{"type":"array","description":"Test set ids to include into the test run. Only the first test set will be considered.","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}}},"description":"Request model to create a test run from multiple test cases or 1 test set"}},"required":["testRunTrackerId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/trackers/{testRunTrackerId}/testruns",
    executionParameters: [{"name":"testRunTrackerId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["createTestRunForTestSets", {
    name: "createTestRunForTestSets",
    description: `Create a new test run for test cases or test sets`,
    inputSchema: {"type":"object","properties":{"testRunTrackerId":{"type":"number","format":"int32"},"requestBody":{"type":"object","properties":{"runOnlyAcceptedTestCases":{"type":"boolean","description":"Generate Test Runs only from accepted Test Cases.","default":false},"testRunModel":{"type":"object","properties":{"accruedMillis":{"type":"number","description":"Accrued work time of a tracker item in milliseconds","format":"int64"},"angularIcon":{"type":"string","description":"Angular icon for the tracker item"},"areas":{"type":"array","description":"Areas of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"assignedAt":{"type":"string","description":"Assignee date of a tracker item","format":"date-time"},"assignedTo":{"type":"array","description":"Assignees of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"categories":{"type":"array","description":"Categories of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"children":{"type":"array","description":"Children of a tracker item","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"closedAt":{"type":"string","description":"Close date of a tracker item","format":"date-time"},"comments":{"type":"array","description":"Comment in the tracker item","items":{"type":"object","description":"Reference to a comment of a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"commonItemId":{"type":"number","description":"Id shared by the branched versions of the tracker item","format":"int32"},"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"customFields":{"type":"array","description":"Custom field of a tracker item","items":{"required":["type"],"type":"object","properties":{"fieldId":{"type":"number","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId."},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}}},"description":{"type":"string","description":"Description of the entity"},"descriptionFormat":{"type":"string","description":"Description format of the entity","enum":["PlainText","Html","Wiki"]},"endDate":{"type":"string","description":"End date of a tracker item","format":"date-time"},"estimatedMillis":{"type":"number","description":"Estimated work time of a tracker item in milliseconds","format":"int64"},"formality":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"iconColor":{"type":"string","description":"Color of the tracker item icon"},"iconUrl":{"type":"string","description":"Url of the tracker item icon"},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"modifiedAt":{"type":"string","description":"The date when the entity was modified","format":"date-time"},"modifiedBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"name":{"type":"string","description":"Name of the entity"},"ordinal":{"type":"number","description":"Ordinal of a tracker item","format":"int32"},"owners":{"type":"array","description":"Owners of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"parent":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]},"platforms":{"type":"array","description":"Platforms of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"priority":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"releaseMethod":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"resolutions":{"type":"array","description":"Resolutions of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"severities":{"type":"array","description":"Severities of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"spentMillis":{"type":"number","description":"Spent work time of a tracker item in milliseconds","format":"int64"},"startDate":{"type":"string","description":"Start date of a tracker item","format":"date-time"},"status":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"storyPoints":{"type":"number","description":"Story points of a tracker item","format":"int32"},"subjects":{"type":"array","description":"Subjects of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"tags":{"type":"array","description":"Tags of the tracker item","items":{"type":"object","properties":{"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"hidden":{"type":"boolean","description":"Whether the label is hidden or not"},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"privateLabel":{"type":"boolean","description":"Whether the label is private or not"}},"description":"Label that is used for entities like tags."}},"teams":{"type":"array","description":"Teams of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"tracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"typeName":{"type":"string","description":"Type name of a tracker item"},"version":{"type":"number","description":"Version of a tracker item","format":"int32"},"versions":{"type":"array","description":"Versions of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}}},"description":"Basic properties of a codebeamer tracker item"},"testSetRefs":{"type":"array","description":"Test set ids to include into the test run. Only the first test set will be considered.","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}}},"description":"Request model to create a test run from multiple test sets"}},"required":["testRunTrackerId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/trackers/{testRunTrackerId}/testruns/generatefromtestset",
    executionParameters: [{"name":"testRunTrackerId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTracker", {
    name: "getTracker",
    description: `Get tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}",
    executionParameters: [{"name":"trackerId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateTracker", {
    name: "updateTracker",
    description: `Updates a specific tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"requestBody":{"required":["defaultShowAncestorItems","defaultShowDescendantItems","deleted","hidden","onlyWorkflowCanCreateNewReferringItem","usingQuickTransitions","usingWorkflow"],"type":"object","properties":{"availableAsTemplate":{"type":"boolean","description":"Indicator if the tracker can be used as a template"},"color":{"type":"string","description":"Color of the tracker"},"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"defaultShowAncestorItems":{"type":"boolean","description":"Default Outline should show Ancestor Items or not"},"defaultShowDescendantItems":{"type":"boolean","description":"Default Outline should show Descendant Items or not"},"deleted":{"type":"boolean","description":"Indicator if the tracker is deleted"},"description":{"type":"string","description":"Description of the entity"},"descriptionFormat":{"type":"string","description":"Description format of the entity","enum":["PlainText","Html","Wiki"]},"hidden":{"type":"boolean","description":"Indicator if the tracker is hidden"},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"keyName":{"type":"string","description":"Keyname of a tracker"},"modifiedAt":{"type":"string","description":"The date when the entity was modified","format":"date-time"},"modifiedBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"name":{"type":"string","description":"Name of the entity"},"onlyWorkflowCanCreateNewReferringItem":{"type":"boolean","description":"If true, then the only way to create new referring items is through workflow actions"},"project":{"type":"object","description":"Reference to a project","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"sharedInWorkingSet":{"type":"boolean","description":"If the tracker is shared in a WorkingSet"},"templateTracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"trackerFieldLayoutSettingsModel":{"type":"object","properties":{"defaultLayout":{"type":"string","description":"defaultLayout of a tracker"},"layouts":{"type":"array","description":"fieldLayoutSettingsModels of a tracker","items":{"type":"object","properties":{"groups":{"type":"array","description":"groupsModels of a fieldLayoutSettingsModel","items":{"type":"object","properties":{"collapsed":{"type":"boolean","description":"collapsed of a groupsModel"},"color":{"type":"string","description":"color of a groupsModel"},"default":{"type":"boolean","description":"default of a groupsModel"},"fields":{"type":"array","description":"fieldModel of a groupsModel","items":{"type":"object","properties":{"field":{"type":"string","description":"field of a fieldModel"},"fieldId":{"type":"number","description":"fieldId of a fieldModel","format":"int32"},"width":{"type":"string","description":"width of a fieldModel"}},"description":"fieldModel of a groupsModel"}},"name":{"type":"string","description":"name of a groupsModel"}},"description":"groupsModels of a fieldLayoutSettingsModel"}},"name":{"type":"string","description":"name of a fieldLayoutSettingsModel"},"showDefault":{"type":"boolean","description":"showDefault of a fieldLayoutSettingsModel"}},"description":"fieldLayoutSettingsModels of a tracker"}},"statusLayout":{"type":"array","description":"statusLayout of a tracker","items":{"type":"object","properties":{"layout":{"type":"string","description":"layout of a statusLayout"},"status":{"type":"string","description":"status of a statusLayout"}},"description":"statusLayout of a tracker"}}},"description":"The field group layouts setting is used when rendering the edit view for a specific tracker item"},"type":{"type":"object","description":"Reference to a tracker type","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"usingQuickTransitions":{"type":"boolean","description":"If true, then every transition will be executed immediately (if possible) without opening an editor for the item"},"usingWorkflow":{"type":"boolean","description":"Should transitions and workflow actions be available in the tracker or not"},"version":{"type":"number","description":"Version of a tracker","format":"int32"}},"description":"Basic properties of a codebeamer tracker"}},"required":["trackerId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/trackers/{trackerId}",
    executionParameters: [{"name":"trackerId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["deleteTracker", {
    name: "deleteTracker",
    description: `Deletes a tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"}},"required":["trackerId"]},
    method: "delete",
    pathTemplate: "/v3/trackers/{trackerId}",
    executionParameters: [{"name":"trackerId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerBaselines", {
    name: "getTrackerBaselines",
    description: `Get baselines of a specific tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/baselines",
    executionParameters: [{"name":"trackerId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["findTrackerChildren", {
    name: "findTrackerChildren",
    description: `Get child items of a tracker item`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"page":{"type":"number","format":"int32","default":1,"description":"Index of the result page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in a result page. Max value: 500"}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/children",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["replaceChildrenOfTracker", {
    name: "replaceChildrenOfTracker",
    description: `Reorder the child item list of a tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"resultPageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in the result page. Max value: 500"},"requestBody":{"type":"object","properties":{"children":{"type":"array","description":"Child items to update","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}}},"description":"Tracker item child update request"}},"required":["trackerId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/trackers/{trackerId}/children",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"resultPageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["addChildToTracker", {
    name: "addChildToTracker",
    description: `Add a child item to a tracker item`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"requestBody":{"type":"object","properties":{"commonItemId":{"type":"number","description":"Tracker common item id","format":"int32"},"id":{"type":"number","description":"Tracker item id","format":"int32"},"version":{"type":"number","description":"Tracker item version","format":"int32"}},"description":"Tracker item revision identifier"}},"required":["trackerId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/trackers/{trackerId}/children",
    executionParameters: [{"name":"trackerId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["patchChildrenOfTracker", {
    name: "patchChildrenOfTracker",
    description: `Patch the child item list of a tracker item`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"mode":{"type":"string","enum":["INSERT"],"default":"INSERT"},"requestBody":{"required":["index","itemReference"],"type":"object","properties":{"index":{"minimum":0,"type":"number","description":"Ordinal in the tracker outline.","format":"int32"},"itemReference":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"description":"Reference to a child item in the tracker outline."}},"required":["trackerId","requestBody"]},
    method: "patch",
    pathTemplate: "/v3/trackers/{trackerId}/children",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"mode","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerFields", {
    name: "getTrackerFields",
    description: `Get fields of tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/fields",
    executionParameters: [{"name":"trackerId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerFieldsPermissions", {
    name: "getTrackerFieldsPermissions",
    description: `Get permissions of all fields of a tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"statusId":{"type":"number","format":"int32"}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/fields/permissions",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"statusId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerField", {
    name: "getTrackerField",
    description: `Get field of tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"fieldId":{"type":"number","format":"int32"}},"required":["trackerId","fieldId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/fields/{fieldId}",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"fieldId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getChoiceOption", {
    name: "getChoiceOption",
    description: `Get option of a choice field of tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"fieldId":{"type":"number","format":"int32"},"optionId":{"type":"number","format":"int32"}},"required":["trackerId","fieldId","optionId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/fields/{fieldId}/options/{optionId}",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"fieldId","in":"path"},{"name":"optionId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerFieldPermissions", {
    name: "getTrackerFieldPermissions",
    description: `Get permissions of tracker field`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"fieldId":{"type":"number","format":"int32"},"statusId":{"type":"number","format":"int32"}},"required":["trackerId","fieldId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/fields/{fieldId}/permissions",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"fieldId","in":"path"},{"name":"statusId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateTrackerIcon", {
    name: "updateTrackerIcon",
    description: `Upload a tracker icon`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32","description":"Id of the tracker"},"requestBody":{"type":"string","description":"Request body (content type: multipart/form-data)"}},"required":["trackerId"]},
    method: "put",
    pathTemplate: "/v3/trackers/{trackerId}/icon",
    executionParameters: [{"name":"trackerId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getItemsByTracker", {
    name: "getItemsByTracker",
    description: `Get items in a specific tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"page":{"type":"number","format":"int32","default":1,"description":"Index of the result page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in a result page. Max value: 500"}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/items",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["createTrackerItem", {
    name: "createTrackerItem",
    description: `Create a tracker item`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"parentItemId":{"type":"number","format":"int32"},"referenceItemId":{"type":"number","format":"int32"},"position":{"type":"string","enum":["BEFORE","AFTER","BELOW"]},"requestBody":{"type":"object","properties":{"accruedMillis":{"type":"number","description":"Accrued work time of a tracker item in milliseconds","format":"int64"},"angularIcon":{"type":"string","description":"Angular icon for the tracker item"},"areas":{"type":"array","description":"Areas of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"assignedAt":{"type":"string","description":"Assignee date of a tracker item","format":"date-time"},"assignedTo":{"type":"array","description":"Assignees of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"categories":{"type":"array","description":"Categories of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"children":{"type":"array","description":"Children of a tracker item","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"closedAt":{"type":"string","description":"Close date of a tracker item","format":"date-time"},"comments":{"type":"array","description":"Comment in the tracker item","items":{"type":"object","description":"Reference to a comment of a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"commonItemId":{"type":"number","description":"Id shared by the branched versions of the tracker item","format":"int32"},"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"customFields":{"type":"array","description":"Custom field of a tracker item","items":{"required":["type"],"type":"object","properties":{"fieldId":{"type":"number","description":"Id of the field","format":"int32"},"name":{"type":"string","description":"Name of the field"},"sharedFieldName":{"type":"string","description":"The name of a shared field assigned to the field. This can be specified as an alternative to fieldId."},"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","items":{"type":"string","description":"The names of a shared fields assigned to the field."}},"type":{"type":"string","description":"Type of the field"}},"description":"Value container of a field","discriminator":{"propertyName":"type"}}},"description":{"type":"string","description":"Description of the entity"},"descriptionFormat":{"type":"string","description":"Description format of the entity","enum":["PlainText","Html","Wiki"]},"endDate":{"type":"string","description":"End date of a tracker item","format":"date-time"},"estimatedMillis":{"type":"number","description":"Estimated work time of a tracker item in milliseconds","format":"int64"},"formality":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"iconColor":{"type":"string","description":"Color of the tracker item icon"},"iconUrl":{"type":"string","description":"Url of the tracker item icon"},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"modifiedAt":{"type":"string","description":"The date when the entity was modified","format":"date-time"},"modifiedBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"name":{"type":"string","description":"Name of the entity"},"ordinal":{"type":"number","description":"Ordinal of a tracker item","format":"int32"},"owners":{"type":"array","description":"Owners of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"parent":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]},"platforms":{"type":"array","description":"Platforms of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"priority":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"releaseMethod":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"resolutions":{"type":"array","description":"Resolutions of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"severities":{"type":"array","description":"Severities of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"spentMillis":{"type":"number","description":"Spent work time of a tracker item in milliseconds","format":"int64"},"startDate":{"type":"string","description":"Start date of a tracker item","format":"date-time"},"status":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"storyPoints":{"type":"number","description":"Story points of a tracker item","format":"int32"},"subjects":{"type":"array","description":"Subjects of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"tags":{"type":"array","description":"Tags of the tracker item","items":{"type":"object","properties":{"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"hidden":{"type":"boolean","description":"Whether the label is hidden or not"},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"privateLabel":{"type":"boolean","description":"Whether the label is private or not"}},"description":"Label that is used for entities like tags."}},"teams":{"type":"array","description":"Teams of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}},"tracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"typeName":{"type":"string","description":"Type name of a tracker item"},"version":{"type":"number","description":"Version of a tracker item","format":"int32"},"versions":{"type":"array","description":"Versions of a tracker item","items":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}}},"description":"Basic properties of a codebeamer tracker item"}},"required":["trackerId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/trackers/{trackerId}/items",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"parentItemId","in":"query"},{"name":"referenceItemId","in":"query"},{"name":"position","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerOutline", {
    name: "getTrackerOutline",
    description: `Get outline of a specific tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"parentItemId":{"type":"number","format":"int32","description":"Show only the children of this item."},"resultDepthFilter":{"type":"number","format":"int32","description":"The depth level of the result outline."}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/outline",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"parentItemId","in":"query"},{"name":"resultDepthFilter","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerPermissionsWithRoles", {
    name: "getTrackerPermissionsWithRoles",
    description: `API can be used to list tracker permissions per roles, filtering is possible by user, user and on of the user's role, or just by role`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"userId":{"type":"number","format":"int32"},"roleId":{"type":"number","format":"int32"}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/permissions",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"userId","in":"query"},{"name":"roleId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerReports", {
    name: "getTrackerReports",
    description: `Get all reports of a specific tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/reports",
    executionParameters: [{"name":"trackerId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["createTrackerReport", {
    name: "createTrackerReport",
    description: `Creates a report of a specific tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"requestBody":{"required":["cbQl","columns","description","isPublic","name","tracker"],"type":"object","properties":{"cbQl":{"type":"string","description":"CbQL query string of the report."},"columns":{"type":"array","description":"Column definitions.","items":{"required":["columnIndex","field"],"type":"object","properties":{"columnIndex":{"type":"number","description":"Index of the column in the report table.","format":"int32"},"columnWidthPercentage":{"type":"number","description":"Width of the column in percentage.","format":"double"},"field":{"type":"object","description":"Reference to a field of a specific tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","readOnly":true,"items":{"type":"string","description":"The names of a shared fields assigned to the field.","readOnly":true}},"trackerId":{"type":"integer","description":"Id of the tracker","format":"int32","example":1000}}}]}},"description":"Settings for a resizeable column definition."}},"description":{"type":"string","description":"Description of the report."},"isPublic":{"type":"boolean","description":"Public report indicator."},"name":{"type":"string","description":"Name of the report."},"referenceLevelSettings":{"type":"array","description":"Reference level setting for Intelligent Table View.","items":{"required":["columns","downstreamReference","level","upstreamReference"],"type":"object","properties":{"columns":{"type":"array","description":"Columns to show on this reference level.","items":{"required":["columnIndex","field"],"type":"object","properties":{"columnIndex":{"type":"number","description":"Index of the column in the report table.","format":"int32"},"field":{"type":"object","description":"Reference to a field of a specific tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","readOnly":true,"items":{"type":"string","description":"The names of a shared fields assigned to the field.","readOnly":true}},"trackerId":{"type":"integer","description":"Id of the tracker","format":"int32","example":1000}}}]}},"description":"Settings for a column definition."}},"downstreamReference":{"type":"boolean","description":"Include downstream references indicator."},"level":{"minimum":1,"type":"number","description":"Level of the reference layer","format":"int32"},"referenceTrackerTypes":{"type":"array","description":"Tracker types to include on this level.","items":{"type":"object","description":"Reference to a tracker type","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"referenceTrackers":{"type":"array","description":"Trackers to include on this level.","items":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"upstreamReference":{"type":"boolean","description":"Include upstream references indicator."}},"description":"Reference level settings for Intelligent Table View."}},"renderingMethod":{"type":"string","description":"Rendering method for Intelligent Table View.","enum":["disabled","table","tree"]},"reportId":{"type":"number","description":"Id of a report","format":"int32"},"showAllChildren":{"type":"boolean","description":"Indicator to ability to collapse/expand all child items."},"showAncestors":{"type":"boolean","description":"Indicator to show the ancestors of a result item."},"showDescendants":{"type":"boolean","description":"Indicator to show the descendants of a result item."},"tracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"description":"Settings of a report on a tracker."}},"required":["trackerId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/trackers/{trackerId}/reports",
    executionParameters: [{"name":"trackerId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateTrackerReport", {
    name: "updateTrackerReport",
    description: `Updates a report of a specific tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"reportId":{"type":"number","format":"int32"},"requestBody":{"required":["cbQl","columns","description","isPublic","name","tracker"],"type":"object","properties":{"cbQl":{"type":"string","description":"CbQL query string of the report."},"columns":{"type":"array","description":"Column definitions.","items":{"required":["columnIndex","field"],"type":"object","properties":{"columnIndex":{"type":"number","description":"Index of the column in the report table.","format":"int32"},"columnWidthPercentage":{"type":"number","description":"Width of the column in percentage.","format":"double"},"field":{"type":"object","description":"Reference to a field of a specific tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","readOnly":true,"items":{"type":"string","description":"The names of a shared fields assigned to the field.","readOnly":true}},"trackerId":{"type":"integer","description":"Id of the tracker","format":"int32","example":1000}}}]}},"description":"Settings for a resizeable column definition."}},"description":{"type":"string","description":"Description of the report."},"isPublic":{"type":"boolean","description":"Public report indicator."},"name":{"type":"string","description":"Name of the report."},"referenceLevelSettings":{"type":"array","description":"Reference level setting for Intelligent Table View.","items":{"required":["columns","downstreamReference","level","upstreamReference"],"type":"object","properties":{"columns":{"type":"array","description":"Columns to show on this reference level.","items":{"required":["columnIndex","field"],"type":"object","properties":{"columnIndex":{"type":"number","description":"Index of the column in the report table.","format":"int32"},"field":{"type":"object","description":"Reference to a field of a specific tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","readOnly":true,"items":{"type":"string","description":"The names of a shared fields assigned to the field.","readOnly":true}},"trackerId":{"type":"integer","description":"Id of the tracker","format":"int32","example":1000}}}]}},"description":"Settings for a column definition."}},"downstreamReference":{"type":"boolean","description":"Include downstream references indicator."},"level":{"minimum":1,"type":"number","description":"Level of the reference layer","format":"int32"},"referenceTrackerTypes":{"type":"array","description":"Tracker types to include on this level.","items":{"type":"object","description":"Reference to a tracker type","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"referenceTrackers":{"type":"array","description":"Trackers to include on this level.","items":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"upstreamReference":{"type":"boolean","description":"Include upstream references indicator."}},"description":"Reference level settings for Intelligent Table View."}},"renderingMethod":{"type":"string","description":"Rendering method for Intelligent Table View.","enum":["disabled","table","tree"]},"reportId":{"type":"number","description":"Id of a report","format":"int32"},"showAllChildren":{"type":"boolean","description":"Indicator to ability to collapse/expand all child items."},"showAncestors":{"type":"boolean","description":"Indicator to show the ancestors of a result item."},"showDescendants":{"type":"boolean","description":"Indicator to show the descendants of a result item."},"tracker":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"description":"Settings of a report on a tracker."}},"required":["trackerId","reportId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/trackers/{trackerId}/reports/{reportId}",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"reportId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["deleteTrackerReport", {
    name: "deleteTrackerReport",
    description: `Deletes a report of a specific tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"reportId":{"type":"number","format":"int32"}},"required":["trackerId","reportId"]},
    method: "delete",
    pathTemplate: "/v3/trackers/{trackerId}/reports/{reportId}",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"reportId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerReportItems", {
    name: "getTrackerReportItems",
    description: `Get report items of a specific tracker view`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"reportId":{"type":"number","format":"int32"},"page":{"type":"number","format":"int32","default":1,"description":"Index of a report page starting from 1."},"pageSize":{"type":"number","format":"int32","default":20,"description":"Number of items a report page. Max value: 500"}},"required":["trackerId","reportId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/reports/{reportId}/items",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"reportId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerReport", {
    name: "getTrackerReport",
    description: `Get a report of a specific tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"reportId":{"type":"number","format":"int32"},"page":{"type":"number","format":"int32","default":1,"description":"Index of a report page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items a report page. Max value: 500"}},"required":["trackerId","reportId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/reports/{reportId}/results",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"reportId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updatePermission", {
    name: "updatePermission",
    description: `Set the tracker permissions for a specific role`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"roleId":{"type":"number","format":"int32"},"requestBody":{"type":"object","properties":{"permissions":{"type":"array","description":"Permission references.","items":{"type":"object","description":"Reference to a tracker permission","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}}},"description":"Request model for multiple items."}},"required":["trackerId","roleId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/trackers/{trackerId}/roles/{roleId}/permissions",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"roleId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["removePermissions", {
    name: "removePermissions",
    description: `Removes all tracker permissions from a specific role`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"roleId":{"type":"number","format":"int32"}},"required":["trackerId","roleId"]},
    method: "delete",
    pathTemplate: "/v3/trackers/{trackerId}/roles/{roleId}/permissions",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"roleId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerSchema", {
    name: "getTrackerSchema",
    description: `Get the schema of a tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/schema",
    executionParameters: [{"name":"trackerId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerTransitions", {
    name: "getTrackerTransitions",
    description: `Get all transitions of a specific tracker`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32"},"fromStatusId":{"type":"number","format":"int32","description":"The from status id filter for transitions."}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/transitions",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"fromStatusId","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getTrackerWorkingSets", {
    name: "getTrackerWorkingSets",
    description: `Lists Working-Sets that contain the given Tracker or Branch.`,
    inputSchema: {"type":"object","properties":{"trackerId":{"type":"number","format":"int32","description":"Tracker or Branch id"},"includeDeleted":{"type":"boolean","description":"Find Tracker or Branch if deleted and the result contains the deleted Working-Sets"}},"required":["trackerId"]},
    method: "get",
    pathTemplate: "/v3/trackers/{trackerId}/working-sets",
    executionParameters: [{"name":"trackerId","in":"path"},{"name":"includeDeleted","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getUsers", {
    name: "getUsers",
    description: `Get users`,
    inputSchema: {"type":"object","properties":{"page":{"type":"number","format":"int32","default":1,"description":"Index of the result page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in a result page. Max value: 500"},"groupId":{"type":"number","format":"int32"},"queryString":{"type":"string"}}},
    method: "get",
    pathTemplate: "/v3/users",
    executionParameters: [{"name":"page","in":"query"},{"name":"pageSize","in":"query"},{"name":"groupId","in":"query"},{"name":"queryString","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getUserByEmail", {
    name: "getUserByEmail",
    description: `Get user by email address`,
    inputSchema: {"type":"object","properties":{"email":{"type":"string"}},"required":["email"]},
    method: "get",
    pathTemplate: "/v3/users/findByEmail",
    executionParameters: [{"name":"email","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getUserByName", {
    name: "getUserByName",
    description: `Get user by name`,
    inputSchema: {"type":"object","properties":{"name":{"type":"string"}},"required":["name"]},
    method: "get",
    pathTemplate: "/v3/users/findByName",
    executionParameters: [{"name":"name","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getGroups", {
    name: "getGroups",
    description: `Get user groups`,
    inputSchema: {"type":"object","properties":{}},
    method: "get",
    pathTemplate: "/v3/users/groups",
    executionParameters: [],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getGroup", {
    name: "getGroup",
    description: `Get user group`,
    inputSchema: {"type":"object","properties":{"groupId":{"type":"number","format":"int32"}},"required":["groupId"]},
    method: "get",
    pathTemplate: "/v3/users/groups/{groupId}",
    executionParameters: [{"name":"groupId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getGroupMembers", {
    name: "getGroupMembers",
    description: `Get all members of a user group`,
    inputSchema: {"type":"object","properties":{"groupId":{"type":"number","format":"int32"},"page":{"type":"number","format":"int32","default":1,"description":"Index of the result page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in a result page. Max value: 500"}},"required":["groupId"]},
    method: "get",
    pathTemplate: "/v3/users/groups/{groupId}/members",
    executionParameters: [{"name":"groupId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["deleteUserGroup", {
    name: "deleteUserGroup",
    description: `Delete the given User Group`,
    inputSchema: {"type":"object","properties":{"userGroupId":{"type":"number","format":"int32","description":"Id of the User group"}},"required":["userGroupId"]},
    method: "delete",
    pathTemplate: "/v3/users/groups/{userGroupId}",
    executionParameters: [{"name":"userGroupId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["searchUsers", {
    name: "searchUsers",
    description: `Search users`,
    inputSchema: {"type":"object","properties":{"page":{"type":"number","format":"int32","default":1,"description":"Index of the result page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in a result page. Max value: 500"},"requestBody":{"type":"object","properties":{"email":{"type":"string","description":"Email of the user"},"firstName":{"type":"string","description":"First name of the user"},"lastName":{"type":"string","description":"Last name of the user"},"name":{"type":"string","description":"Name of the user"},"projectId":{"type":"number","description":"Id of the project where the user is a member","format":"int32"},"userStatus":{"type":"string","description":"Status of the user","enum":["ACTIVATED","DISABLED","INACTIVATION"]}},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/users/search",
    executionParameters: [{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getUser", {
    name: "getUser",
    description: `Get user`,
    inputSchema: {"type":"object","properties":{"userId":{"type":"number","format":"int32"}},"required":["userId"]},
    method: "get",
    pathTemplate: "/v3/users/{userId}",
    executionParameters: [{"name":"userId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["createWikiPage", {
    name: "createWikiPage",
    description: `Create a new wiki page`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","properties":{"changeComment":{"type":"string","description":"Summary of the changes in this wiki page version"},"childPages":{"type":"array","description":"Child pages of the current Wiki page","items":{"type":"object","description":"Reference to a wiki page","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"comments":{"type":"array","description":"Comments/attachments associated with the wiki page","items":{"type":"object","description":"Reference to an attachment","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"description":{"type":"string","description":"Description of the entity"},"descriptionFormat":{"type":"string","description":"Description format of the entity","enum":["PlainText","Html","Wiki"]},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"markup":{"type":"string","description":"Content markup of the wiki page"},"modifiedAt":{"type":"string","description":"The date when the entity was modified","format":"date-time"},"modifiedBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"name":{"type":"string","description":"Name of the entity"},"parent":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"project":{"type":"object","description":"Reference to a project","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"version":{"type":"number","description":"Version of the wiki page","format":"int32"}},"description":"Wiki page details"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/wikipages",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateWikiPage", {
    name: "updateWikiPage",
    description: `Update and/or move a wiki page`,
    inputSchema: {"type":"object","properties":{"itemId":{"type":"number","format":"int32","description":"Id of the wiki page to update"},"requestBody":{"type":"object","properties":{"changeComment":{"type":"string","description":"Summary of the changes in this wiki page version"},"childPages":{"type":"array","description":"Child pages of the current Wiki page","items":{"type":"object","description":"Reference to a wiki page","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"comments":{"type":"array","description":"Comments/attachments associated with the wiki page","items":{"type":"object","description":"Reference to an attachment","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"createdAt":{"type":"string","description":"The date when the entity was created","format":"date-time"},"createdBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"description":{"type":"string","description":"Description of the entity"},"descriptionFormat":{"type":"string","description":"Description format of the entity","enum":["PlainText","Html","Wiki"]},"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"markup":{"type":"string","description":"Content markup of the wiki page"},"modifiedAt":{"type":"string","description":"The date when the entity was modified","format":"date-time"},"modifiedBy":{"type":"object","description":"Reference to a user","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"displayName":{"type":"string","description":"Display name of the user (formatted using the 'accountLink' application config)"},"email":{"type":"string","description":"Email of a referenced user"}}}]},"name":{"type":"string","description":"Name of the entity"},"parent":{"type":"object","properties":{"id":{"minimum":0,"type":"number","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},"project":{"type":"object","description":"Reference to a project","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"version":{"type":"number","description":"Version of the wiki page","format":"int32"}},"description":"Wiki page details"}},"required":["itemId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/wikipages/{itemId}",
    executionParameters: [{"name":"itemId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getWikiPage", {
    name: "getWikiPage",
    description: `Get wiki page`,
    inputSchema: {"type":"object","properties":{"wikiId":{"type":"number","format":"int32","description":"ID of the wiki page"},"version":{"type":"number","format":"int32","description":"Version of the wiki page"}},"required":["wikiId"]},
    method: "get",
    pathTemplate: "/v3/wikipages/{wikiId}",
    executionParameters: [{"name":"wikiId","in":"path"},{"name":"version","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["deleteWikiPage", {
    name: "deleteWikiPage",
    description: `Delete a wiki page by its ID`,
    inputSchema: {"type":"object","properties":{"wikiId":{"type":"number","format":"int32","description":"ID of the wiki page"}},"required":["wikiId"]},
    method: "delete",
    pathTemplate: "/v3/wikipages/{wikiId}",
    executionParameters: [{"name":"wikiId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getAttachmentByName", {
    name: "getAttachmentByName",
    description: `Get attachment of wiki page by file name`,
    inputSchema: {"type":"object","properties":{"wikiId":{"type":"number","format":"int32"},"fileName":{"type":"string"}},"required":["wikiId","fileName"]},
    method: "get",
    pathTemplate: "/v3/wikipages/{wikiId}/attachments",
    executionParameters: [{"name":"wikiId","in":"path"},{"name":"fileName","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["commentOnWiki", {
    name: "commentOnWiki",
    description: `Comment on a wiki page`,
    inputSchema: {"type":"object","properties":{"wikiId":{"type":"number","format":"int32"},"requestBody":{"type":"string","description":"Request body (content type: multipart/form-data)"}},"required":["wikiId"]},
    method: "post",
    pathTemplate: "/v3/wikipages/{wikiId}/comments",
    executionParameters: [{"name":"wikiId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getWikiPageHistory", {
    name: "getWikiPageHistory",
    description: `Returns the change history of the specified wiki page`,
    inputSchema: {"type":"object","properties":{"wikiId":{"type":"number","format":"int32"},"page":{"type":"number","format":"int32","default":1,"description":"Index of the result page starting from 1."},"pageSize":{"type":"number","format":"int32","default":25,"description":"Number of items in a result page. Max value: 500"}},"required":["wikiId"]},
    method: "get",
    pathTemplate: "/v3/wikipages/{wikiId}/history",
    executionParameters: [{"name":"wikiId","in":"path"},{"name":"page","in":"query"},{"name":"pageSize","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["renderWikiPage", {
    name: "renderWikiPage",
    description: `Render a wiki page as HTML`,
    inputSchema: {"type":"object","properties":{"wikiId":{"type":"number","format":"int32","description":"ID of the wiki page"},"version":{"type":"number","format":"int32","description":"version of the wiki page"}},"required":["wikiId"]},
    method: "get",
    pathTemplate: "/v3/wikipages/{wikiId}/html",
    executionParameters: [{"name":"wikiId","in":"path"},{"name":"version","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["checkWikiPageLock", {
    name: "checkWikiPageLock",
    description: `Check whether a wiki page is locked, and if it is, retrieve the details of the lock`,
    inputSchema: {"type":"object","properties":{"wikiId":{"type":"number","format":"int32","description":"Wiki page id"}},"required":["wikiId"]},
    method: "get",
    pathTemplate: "/v3/wikipages/{wikiId}/lock",
    executionParameters: [{"name":"wikiId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["lockWikiPage", {
    name: "lockWikiPage",
    description: `Lock a wiki page`,
    inputSchema: {"type":"object","properties":{"wikiId":{"type":"number","format":"int32","description":"Wiki page id"},"requestBody":{"type":"object","properties":{"duration":{"type":"string","description":"If not a hard lock, the duration specified in time notation"},"hard":{"type":"boolean","description":"Whether the lock should be hard"}},"description":"Requested lock configuration"}},"required":["wikiId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/wikipages/{wikiId}/lock",
    executionParameters: [{"name":"wikiId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["unlockWikiPage", {
    name: "unlockWikiPage",
    description: `Unlock a wiki page`,
    inputSchema: {"type":"object","properties":{"wikiId":{"type":"number","format":"int32","description":"Wiki page id"}},"required":["wikiId"]},
    method: "delete",
    pathTemplate: "/v3/wikipages/{wikiId}/lock",
    executionParameters: [{"name":"wikiId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getWikiPermissions", {
    name: "getWikiPermissions",
    description: `Get permissions of a wiki page`,
    inputSchema: {"type":"object","properties":{"wikiId":{"type":"number","format":"int32","description":"Wiki page id"}},"required":["wikiId"]},
    method: "get",
    pathTemplate: "/v3/wikipages/{wikiId}/permissions",
    executionParameters: [{"name":"wikiId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["setWikiPermissions", {
    name: "setWikiPermissions",
    description: `Set permissions of a wiki page`,
    inputSchema: {"type":"object","properties":{"wikiId":{"type":"number","format":"int32","description":"Wiki page id"},"recursive":{"type":"boolean","default":false,"description":"Set permissions of children recursively"},"requestBody":{"type":"object","properties":{"permissions":{"type":"array","description":"List of access permissions.","items":{"type":"object","properties":{"accessLevel":{"type":"string","description":"Access level","enum":["NONE","READ","WRITE","READ_WRITE"]},"field":{"type":"object","description":"Reference to a field of a specific tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"sharedFieldNames":{"type":"array","description":"The names of a shared fields assigned to the field.","readOnly":true,"items":{"type":"string","description":"The names of a shared fields assigned to the field.","readOnly":true}},"trackerId":{"type":"integer","description":"Id of the tracker","format":"int32","example":1000}}}]},"project":{"type":"object","description":"Reference to a project","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]},"role":{"type":"object","description":"Reference to a role","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"description":"Access permission of specific role"}}},"description":"Request model to provide permissions."}},"required":["wikiId","requestBody"]},
    method: "put",
    pathTemplate: "/v3/wikipages/{wikiId}/permissions",
    executionParameters: [{"name":"wikiId","in":"path"},{"name":"recursive","in":"query"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["restoreWikiPageContent", {
    name: "restoreWikiPageContent",
    description: `Restores the content from a previous version of a wiki page`,
    inputSchema: {"type":"object","properties":{"wikiId":{"type":"number","format":"int32","description":"Wiki page id"},"version":{"type":"number","format":"int32","description":"The version to be restored"}},"required":["wikiId","version"]},
    method: "put",
    pathTemplate: "/v3/wikipages/{wikiId}/restorecontent",
    executionParameters: [{"name":"wikiId","in":"path"},{"name":"version","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getItemsMappingInWorkingSet", {
    name: "getItemsMappingInWorkingSet",
    description: `Maps Tracker Items to the corresponding Tracker Items in target Working-Set.`,
    inputSchema: {"type":"object","properties":{"requestBody":{"required":["items","targetWorkingSet"],"type":"object","properties":{"items":{"maxItems":2147483647,"minItems":1,"uniqueItems":true,"type":"array","description":"Tracker Items on Working-Set or on the Default Working-Set","items":{"type":"object","description":"Reference to a tracker item","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}},{"type":"object","properties":{"angularIcon":{"type":"string"},"commonItemId":{"type":"integer","format":"int32"},"iconColor":{"type":"string"},"propagateSuspects":{"type":"boolean"},"referenceData":{"type":"object","properties":{"suspectPropagation":{"type":"string","description":"Type of suspect propagation","enum":["DO_NOT_PROPAGATE","PROPAGATE","REVERSE","BIDIRECTIONAL"]}},"description":"Properties of a tracker item reference"},"testStepReuse":{"type":"boolean"},"trackerKey":{"type":"string"},"trackerTypeId":{"type":"integer","format":"int32"},"uri":{"type":"string"}}}]}},"targetWorkingSet":{"type":"object","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"description":"Working-Set Tracker Items mapping request object"}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/v3/working-sets/items-mapping",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getWorkingSetInformation", {
    name: "getWorkingSetInformation",
    description: `Gets the Working-Set information for the given id.`,
    inputSchema: {"type":"object","properties":{"workingSetId":{"type":"number","format":"int32","description":"Id of the Working-Set"},"includeDeleted":{"type":"boolean","description":"The result contains the deleted Working-Sets"}},"required":["workingSetId"]},
    method: "get",
    pathTemplate: "/v3/working-sets/{workingSetId}",
    executionParameters: [{"name":"workingSetId","in":"path"},{"name":"includeDeleted","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["getWorkingSetTrackers", {
    name: "getWorkingSetTrackers",
    description: `Lists the trackers (shared and included) in the given Working-Set.`,
    inputSchema: {"type":"object","properties":{"workingSetId":{"type":"number","format":"int32","description":"Working-Set id"},"includeDeleted":{"type":"boolean","description":"The result contains the deleted Trackers"}},"required":["workingSetId"]},
    method: "get",
    pathTemplate: "/v3/working-sets/{workingSetId}/trackers",
    executionParameters: [{"name":"workingSetId","in":"path"},{"name":"includeDeleted","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
  ["updateWorkingSetPermission", {
    name: "updateWorkingSetPermission",
    description: `Set the trackers permissions for specific roles in the given workingset`,
    inputSchema: {"type":"object","properties":{"workingSetId":{"type":"number","format":"int32"},"requestBody":{"type":"object","properties":{"permissions":{"type":"array","description":"Permission references.","items":{"type":"object","description":"Reference to a tracker permission","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"roles":{"type":"array","description":"Role references.","items":{"type":"object","description":"Reference to a role","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}},"trackers":{"type":"array","description":"Tracker references.","items":{"type":"object","description":"Reference to a tracker","allOf":[{"type":"object","properties":{"id":{"minimum":0,"type":"integer","description":"Id of the entity","format":"int32"},"name":{"type":"string","description":"Name of the entity"},"type":{"type":"string","description":"Type of a referenced object"}},"description":"Reference to an item","discriminator":{"propertyName":"type"}}]}}},"description":"Request model trackers, roles and permissions."}},"required":["workingSetId","requestBody"]},
    method: "post",
    pathTemplate: "/v3/workingset/{workingSetId}/permission",
    executionParameters: [{"name":"workingSetId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[],"BasicAuth":[],"BearerAuth":[]}]
  }],
]);

/**
 * Security schemes from the OpenAPI spec
 */
const securitySchemes =   {
    "ApiKeyAuth": {
      "description": "Please login using your codebeamer token",
      "in": "header",
      "name": "Authorization",
      "type": "apiKey"
    },
    "BasicAuth": {
      "description": "Please use your username and password",
      "scheme": "basic",
      "type": "http"
    },
    "BearerAuth": {
      "bearerFormat": "JWT",
      "description": "Please login using your openId token",
      "scheme": "bearer",
      "type": "http"
    }
  };


server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolsForClient: Tool[] = Array.from(toolDefinitionMap.values()).map(def => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema
  }));
  return { tools: toolsForClient };
});


server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const { name: toolName, arguments: toolArgs } = request.params;
  const toolDefinition = toolDefinitionMap.get(toolName);
  if (!toolDefinition) {
    console.error(`Error: Unknown tool requested: ${toolName}`);
    return { content: [{ type: "text", text: `Error: Unknown tool requested: ${toolName}` }] };
  }
  return await executeApiTool(toolName, toolDefinition, toolArgs ?? {}, securitySchemes);
});



/**
 * Type definition for cached OAuth tokens
 */
interface TokenCacheEntry {
    token: string;
    expiresAt: number;
}

/**
 * Declare global __oauthTokenCache property for TypeScript
 */
declare global {
    var __oauthTokenCache: Record<string, TokenCacheEntry> | undefined;
}

/**
 * Acquires an OAuth2 token using client credentials flow
 * 
 * @param schemeName Name of the security scheme
 * @param scheme OAuth2 security scheme
 * @returns Acquired token or null if unable to acquire
 */
async function acquireOAuth2Token(schemeName: string, scheme: any): Promise<string | null | undefined> {
    try {
        // Check if we have the necessary credentials
        const clientId = process.env[`OAUTH_CLIENT_ID_SCHEMENAME`];
        const clientSecret = process.env[`OAUTH_CLIENT_SECRET_SCHEMENAME`];
        const scopes = process.env[`OAUTH_SCOPES_SCHEMENAME`];
        
        if (!clientId || !clientSecret) {
            console.error(`Missing client credentials for OAuth2 scheme '${schemeName}'`);
            return null;
        }
        
        // Initialize token cache if needed
        if (typeof global.__oauthTokenCache === 'undefined') {
            global.__oauthTokenCache = {};
        }
        
        // Check if we have a cached token
        const cacheKey = `${schemeName}_${clientId}`;
        const cachedToken = global.__oauthTokenCache[cacheKey];
        const now = Date.now();
        
        if (cachedToken && cachedToken.expiresAt > now) {
            console.error(`Using cached OAuth2 token for '${schemeName}' (expires in ${Math.floor((cachedToken.expiresAt - now) / 1000)} seconds)`);
            return cachedToken.token;
        }
        
        // Determine token URL based on flow type
        let tokenUrl = '';
        if (scheme.flows?.clientCredentials?.tokenUrl) {
            tokenUrl = scheme.flows.clientCredentials.tokenUrl;
            console.error(`Using client credentials flow for '${schemeName}'`);
        } else if (scheme.flows?.password?.tokenUrl) {
            tokenUrl = scheme.flows.password.tokenUrl;
            console.error(`Using password flow for '${schemeName}'`);
        } else {
            console.error(`No supported OAuth2 flow found for '${schemeName}'`);
            return null;
        }
        
        // Prepare the token request
        let formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        
        // Add scopes if specified
        if (scopes) {
            formData.append('scope', scopes);
        }
        
        console.error(`Requesting OAuth2 token from ${tokenUrl}`);
        
        // Make the token request
        const response = await axios({
            method: 'POST',
            url: tokenUrl,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            data: formData.toString()
        });
        
        // Process the response
        if (response.data?.access_token) {
            const token = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600; // Default to 1 hour
            
            // Cache the token
            global.__oauthTokenCache[cacheKey] = {
                token,
                expiresAt: now + (expiresIn * 1000) - 60000 // Expire 1 minute early
            };
            
            console.error(`Successfully acquired OAuth2 token for '${schemeName}' (expires in ${expiresIn} seconds)`);
            return token;
        } else {
            console.error(`Failed to acquire OAuth2 token for '${schemeName}': No access_token in response`);
            return null;
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error acquiring OAuth2 token for '${schemeName}':`, errorMessage);
        return null;
    }
}


/**
 * Executes an API tool with the provided arguments
 * 
 * @param toolName Name of the tool to execute
 * @param definition Tool definition
 * @param toolArgs Arguments provided by the user
 * @param allSecuritySchemes Security schemes from the OpenAPI spec
 * @returns Call tool result
 */
async function executeApiTool(
    toolName: string,
    definition: McpToolDefinition,
    toolArgs: JsonObject,
    allSecuritySchemes: Record<string, any>
): Promise<CallToolResult> {
  try {
    // Validate arguments against the input schema
    let validatedArgs: JsonObject;
    try {
        const zodSchema = getZodSchemaFromJsonSchema(definition.inputSchema, toolName);
        const argsToParse = (typeof toolArgs === 'object' && toolArgs !== null) ? toolArgs : {};
        validatedArgs = zodSchema.parse(argsToParse);
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            const validationErrorMessage = `Invalid arguments for tool '${toolName}': ${error.errors.map(e => `${e.path.join('.')} (${e.code}): ${e.message}`).join(', ')}`;
            return { content: [{ type: 'text', text: validationErrorMessage }] };
        } else {
             const errorMessage = error instanceof Error ? error.message : String(error);
             return { content: [{ type: 'text', text: `Internal error during validation setup: ${errorMessage}` }] };
        }
    }

    // Prepare URL, query parameters, headers, and request body
    let urlPath = definition.pathTemplate;
    const queryParams: Record<string, any> = {};
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    let requestBodyData: any = undefined;

    // Apply parameters to the URL path, query, or headers
    definition.executionParameters.forEach((param) => {
        const value = validatedArgs[param.name];
        if (typeof value !== 'undefined' && value !== null) {
            if (param.in === 'path') {
                urlPath = urlPath.replace(`{${param.name}}`, encodeURIComponent(String(value)));
            }
            else if (param.in === 'query') {
                queryParams[param.name] = value;
            }
            else if (param.in === 'header') {
                headers[param.name.toLowerCase()] = String(value);
            }
        }
    });

    // Ensure all path parameters are resolved
    if (urlPath.includes('{')) {
        throw new Error(`Failed to resolve path parameters: ${urlPath}`);
    }
    
    // Construct the full URL
    const requestUrl = API_BASE_URL ? `${API_BASE_URL}${urlPath}` : urlPath;

    // Handle request body if needed
    if (definition.requestBodyContentType && typeof validatedArgs['requestBody'] !== 'undefined') {
        requestBodyData = validatedArgs['requestBody'];
        headers['content-type'] = definition.requestBodyContentType;
    }


    // Apply security requirements if available
    // Security requirements use OR between array items and AND within each object
    const appliedSecurity = definition.securityRequirements?.find(req => {
        // Try each security requirement (combined with OR)
        return Object.entries(req).every(([schemeName, scopesArray]) => {
            const scheme = allSecuritySchemes[schemeName];
            if (!scheme) return false;
            
            // API Key security (header, query, cookie)
            if (scheme.type === 'apiKey') {
                return !!process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
            }
            
            // HTTP security (basic, bearer)
            if (scheme.type === 'http') {
                if (scheme.scheme?.toLowerCase() === 'bearer') {
                    return !!process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                }
                else if (scheme.scheme?.toLowerCase() === 'basic') {
                    return !!process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] && 
                           !!process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                }
            }
            
            // OAuth2 security
            if (scheme.type === 'oauth2') {
                // Check for pre-existing token
                if (process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
                    return true;
                }
                
                // Check for client credentials for auto-acquisition
                if (process.env[`OAUTH_CLIENT_ID_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] &&
                    process.env[`OAUTH_CLIENT_SECRET_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
                    // Verify we have a supported flow
                    if (scheme.flows?.clientCredentials || scheme.flows?.password) {
                        return true;
                    }
                }
                
                return false;
            }
            
            // OpenID Connect
            if (scheme.type === 'openIdConnect') {
                return !!process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
            }
            
            return false;
        });
    });

    // If we found matching security scheme(s), apply them
    if (appliedSecurity) {
        // Apply each security scheme from this requirement (combined with AND)
        for (const [schemeName, scopesArray] of Object.entries(appliedSecurity)) {
            const scheme = allSecuritySchemes[schemeName];
            
            // API Key security
            if (scheme?.type === 'apiKey') {
                const apiKey = process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                if (apiKey) {
                    if (scheme.in === 'header') {
                        headers[scheme.name.toLowerCase()] = apiKey;
                        console.error(`Applied API key '${schemeName}' in header '${scheme.name}'`);
                    }
                    else if (scheme.in === 'query') {
                        queryParams[scheme.name] = apiKey;
                        console.error(`Applied API key '${schemeName}' in query parameter '${scheme.name}'`);
                    }
                    else if (scheme.in === 'cookie') {
                        // Add the cookie, preserving other cookies if they exist
                        headers['cookie'] = `${scheme.name}=${apiKey}${headers['cookie'] ? `; ${headers['cookie']}` : ''}`;
                        console.error(`Applied API key '${schemeName}' in cookie '${scheme.name}'`);
                    }
                }
            } 
            // HTTP security (Bearer or Basic)
            else if (scheme?.type === 'http') {
                if (scheme.scheme?.toLowerCase() === 'bearer') {
                    const token = process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    if (token) {
                        headers['authorization'] = `Bearer ${token}`;
                        console.error(`Applied Bearer token for '${schemeName}'`);
                    }
                } 
                else if (scheme.scheme?.toLowerCase() === 'basic') {
                    const username = process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    const password = process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    if (username && password) {
                        headers['authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
                        console.error(`Applied Basic authentication for '${schemeName}'`);
                    }
                }
            }
            // OAuth2 security
            else if (scheme?.type === 'oauth2') {
                // First try to use a pre-provided token
                let token = process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                
                // If no token but we have client credentials, try to acquire a token
                if (!token && (scheme.flows?.clientCredentials || scheme.flows?.password)) {
                    console.error(`Attempting to acquire OAuth token for '${schemeName}'`);
                    token = (await acquireOAuth2Token(schemeName, scheme)) ?? '';
                }
                
                // Apply token if available
                if (token) {
                    headers['authorization'] = `Bearer ${token}`;
                    console.error(`Applied OAuth2 token for '${schemeName}'`);
                    
                    // List the scopes that were requested, if any
                    const scopes = scopesArray as string[];
                    if (scopes && scopes.length > 0) {
                        console.error(`Requested scopes: ${scopes.join(', ')}`);
                    }
                }
            }
            // OpenID Connect
            else if (scheme?.type === 'openIdConnect') {
                const token = process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                if (token) {
                    headers['authorization'] = `Bearer ${token}`;
                    console.error(`Applied OpenID Connect token for '${schemeName}'`);
                    
                    // List the scopes that were requested, if any
                    const scopes = scopesArray as string[];
                    if (scopes && scopes.length > 0) {
                        console.error(`Requested scopes: ${scopes.join(', ')}`);
                    }
                }
            }
        }
    } 
    // Log warning if security is required but not available
    else if (definition.securityRequirements?.length > 0) {
        // First generate a more readable representation of the security requirements
        const securityRequirementsString = definition.securityRequirements
            .map(req => {
                const parts = Object.entries(req)
                    .map(([name, scopesArray]) => {
                        const scopes = scopesArray as string[];
                        if (scopes.length === 0) return name;
                        return `${name} (scopes: ${scopes.join(', ')})`;
                    })
                    .join(' AND ');
                return `[${parts}]`;
            })
            .join(' OR ');
            
        console.warn(`Tool '${toolName}' requires security: ${securityRequirementsString}, but no suitable credentials found.`);
    }
    

    // Prepare the axios request configuration
    const config: AxiosRequestConfig = {
      method: definition.method.toUpperCase(), 
      url: requestUrl, 
      params: queryParams, 
      headers: headers,
      ...(requestBodyData !== undefined && { data: requestBodyData }),
    };

    // Log request info to stderr (doesn't affect MCP output)
    console.error(`Executing tool "${toolName}": ${config.method} ${config.url}`);
    
    // Execute the request
    const response = await axios(config);

    // Process and format the response
    let responseText = '';
    const contentType = response.headers['content-type']?.toLowerCase() || '';
    
    // Handle JSON responses
    if (contentType.includes('application/json') && typeof response.data === 'object' && response.data !== null) {
         try { 
             responseText = JSON.stringify(response.data, null, 2); 
         } catch (e) { 
             responseText = "[Stringify Error]"; 
         }
    } 
    // Handle string responses
    else if (typeof response.data === 'string') { 
         responseText = response.data; 
    }
    // Handle other response types
    else if (response.data !== undefined && response.data !== null) { 
         responseText = String(response.data); 
    }
    // Handle empty responses
    else { 
         responseText = `(Status: ${response.status} - No body content)`; 
    }
    
    // Return formatted response
    return { 
        content: [ 
            { 
                type: "text", 
                text: `API Response (Status: ${response.status}):\n${responseText}` 
            } 
        ], 
    };

  } catch (error: unknown) {
    // Handle errors during execution
    let errorMessage: string;
    
    // Format Axios errors specially
    if (axios.isAxiosError(error)) { 
        errorMessage = formatApiError(error); 
    }
    // Handle standard errors
    else if (error instanceof Error) { 
        errorMessage = error.message; 
    }
    // Handle unexpected error types
    else { 
        errorMessage = 'Unexpected error: ' + String(error); 
    }
    
    // Log error to stderr
    console.error(`Error during execution of tool '${toolName}':`, errorMessage);
    
    // Return error message to client
    return { content: [{ type: "text", text: errorMessage }] };
  }
}


/**
 * Main function to start the server
 */
async function main() {
// Set up stdio transport
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`${SERVER_NAME} MCP Server (v${SERVER_VERSION}) running on stdio${API_BASE_URL ? `, proxying API at ${API_BASE_URL}` : ''}`);
  } catch (error) {
    console.error("Error during server startup:", error);
    process.exit(1);
  }
}

/**
 * Cleanup function for graceful shutdown
 */
async function cleanup() {
    console.error("Shutting down MCP server...");
    process.exit(0);
}

// Register signal handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the server
main().catch((error) => {
  console.error("Fatal error in main execution:", error);
  process.exit(1);
});

/**
 * Formats API errors for better readability
 * 
 * @param error Axios error
 * @returns Formatted error message
 */
function formatApiError(error: AxiosError): string {
    let message = 'API request failed.';
    if (error.response) {
        message = `API Error: Status ${error.response.status} (${error.response.statusText || 'Status text not available'}). `;
        const responseData = error.response.data;
        const MAX_LEN = 200;
        if (typeof responseData === 'string') { 
            message += `Response: ${responseData.substring(0, MAX_LEN)}${responseData.length > MAX_LEN ? '...' : ''}`; 
        }
        else if (responseData) { 
            try { 
                const jsonString = JSON.stringify(responseData); 
                message += `Response: ${jsonString.substring(0, MAX_LEN)}${jsonString.length > MAX_LEN ? '...' : ''}`; 
            } catch { 
                message += 'Response: [Could not serialize data]'; 
            } 
        }
        else { 
            message += 'No response body received.'; 
        }
    } else if (error.request) {
        message = 'API Network Error: No response received from server.';
        if (error.code) message += ` (Code: ${error.code})`;
    } else { 
        message += `API Request Setup Error: ${error.message}`; 
    }
    return message;
}

/**
 * Converts a JSON Schema to a Zod schema for runtime validation
 * 
 * @param jsonSchema JSON Schema
 * @param toolName Tool name for error reporting
 * @returns Zod schema
 */
function getZodSchemaFromJsonSchema(jsonSchema: any, toolName: string): z.ZodTypeAny {
    if (typeof jsonSchema !== 'object' || jsonSchema === null) { 
        return z.object({}).passthrough(); 
    }
    try {
        const zodSchemaString = jsonSchemaToZod(jsonSchema);
        const zodSchema = eval(zodSchemaString);
        if (typeof zodSchema?.parse !== 'function') { 
            throw new Error('Eval did not produce a valid Zod schema.'); 
        }
        return zodSchema as z.ZodTypeAny;
    } catch (err: any) {
        console.error(`Failed to generate/evaluate Zod schema for '${toolName}':`, err);
        return z.object({}).passthrough();
    }
}

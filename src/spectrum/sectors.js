/**
 * Spectrum sector and ring definitions.
 *
 * Maps all 40 types from the Effector type catalog into 8 thematic sectors
 * and 4 concentric rings (Primitive -> Domain -> Structured -> Complex).
 */

export const SECTORS = [
  {
    name: 'Code',
    types: ['CodeDiff', 'CodeSnippet', 'PatchSet', 'ReviewReport', 'LintReport'],
    color: '#4A9EFF',
  },
  {
    name: 'Data',
    types: ['JSON', 'String', 'DataTable', 'StructuredData', 'TextDocument'],
    color: '#22D3EE',
  },
  {
    name: 'Research',
    types: ['RepositoryRef', 'IssueRef', 'PullRequestRef', 'CommitRef', 'Summary', 'TranslatedText'],
    color: '#A78BFA',
  },
  {
    name: 'Communication',
    types: ['Notification', 'SlackMessage', 'DiscordMessage', 'Markdown'],
    color: '#F472B6',
  },
  {
    name: 'Security',
    types: ['SecurityReport', 'GitHubCredentials', 'GenericAPIKey', 'AWSCredentials', 'APICredentials', 'SlackCredentials'],
    color: '#F87171',
  },
  {
    name: 'Infrastructure',
    types: ['Docker', 'Kubernetes', 'ShellEnvironment', 'DeploymentStatus', 'OperationStatus'],
    color: '#34D399',
  },
  {
    name: 'API',
    types: ['URL', 'FilePath', 'ImageRef', 'TestResult'],
    color: '#FBBF24',
  },
  {
    name: 'Orchestration',
    types: ['CodingStandards', 'Repository', 'UserPreferences', 'ConversationHistory', 'PromptContext'],
    color: '#FB923C',
  },
];

export const RINGS = [
  { name: 'Primitive', radius: 0.25 },
  { name: 'Domain', radius: 0.50 },
  { name: 'Structured', radius: 0.75 },
  { name: 'Complex', radius: 1.00 },
];

/**
 * Ring assignment for every type. Types not listed here default to 'Domain'.
 */
const TYPE_RING_MAP = {
  // Primitive ring — basic scalars and formats
  String: 'Primitive',
  JSON: 'Primitive',
  Markdown: 'Primitive',
  URL: 'Primitive',
  FilePath: 'Primitive',

  // Domain ring — single-purpose domain objects
  CodeDiff: 'Domain',
  CodeSnippet: 'Domain',
  RepositoryRef: 'Domain',
  IssueRef: 'Domain',
  PullRequestRef: 'Domain',
  CommitRef: 'Domain',
  ImageRef: 'Domain',
  Notification: 'Domain',
  GitHubCredentials: 'Domain',
  GenericAPIKey: 'Domain',
  AWSCredentials: 'Domain',
  APICredentials: 'Domain',
  SlackCredentials: 'Domain',
  Docker: 'Domain',
  Kubernetes: 'Domain',
  ShellEnvironment: 'Domain',
  Repository: 'Domain',

  // Structured ring — compound reports and messages
  ReviewReport: 'Structured',
  SecurityReport: 'Structured',
  LintReport: 'Structured',
  Summary: 'Structured',
  TranslatedText: 'Structured',
  SlackMessage: 'Structured',
  DiscordMessage: 'Structured',
  OperationStatus: 'Structured',
  TestResult: 'Structured',
  DeploymentStatus: 'Structured',
  DataTable: 'Structured',
  TextDocument: 'Structured',
  CodingStandards: 'Structured',
  UserPreferences: 'Structured',

  // Complex ring — multi-part, orchestration-level
  PatchSet: 'Complex',
  StructuredData: 'Complex',
  ConversationHistory: 'Complex',
  PromptContext: 'Complex',
};

/**
 * Get the ring name for a type.
 * @param {string} typeName
 * @returns {string}
 */
export function getTypeRing(typeName) {
  return TYPE_RING_MAP[typeName] || 'Domain';
}

/**
 * Get the sector name for a type.
 * @param {string} typeName
 * @returns {string|null}
 */
export function getTypeSector(typeName) {
  for (const sector of SECTORS) {
    if (sector.types.includes(typeName)) return sector.name;
  }
  return null;
}

/**
 * Return all types across all sectors.
 * @returns {string[]}
 */
export function getAllTypes() {
  const types = [];
  for (const sector of SECTORS) {
    for (const t of sector.types) {
      if (!types.includes(t)) types.push(t);
    }
  }
  return types;
}

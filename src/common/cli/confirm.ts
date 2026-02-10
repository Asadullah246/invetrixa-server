import * as readline from 'readline';
import os from 'os';
import { execSync } from 'child_process';

// ============================================
// 🎨 ANSI Color Utilities (zero dependencies)
// ============================================

// Check if basic colors are supported
const isColorSupported =
  process.stdout.isTTY &&
  process.env.NO_COLOR === undefined &&
  process.env.FORCE_COLOR !== '0';

// Check if RGB/truecolor (24-bit) is supported
const isTrueColorSupported = (() => {
  if (!isColorSupported) return false;

  // Check COLORTERM env variable (most reliable)
  const colorTerm = process.env.COLORTERM;
  if (colorTerm === 'truecolor' || colorTerm === '24bit') return true;

  // Check TERM variable
  const term = process.env.TERM || '';
  if (term.includes('truecolor') || term.includes('24bit')) return true;
  if (term.includes('256color')) return true; // Most 256color terminals also support truecolor

  // Check for known terminals that support truecolor
  if (process.env.WT_SESSION) return true; // Windows Terminal
  if (process.env.TERMINAL_EMULATOR === 'JetBrains-JediTerm') return true; // JetBrains IDEs
  if (process.env.TERM_PROGRAM === 'vscode') return true; // VS Code
  if (process.env.TERM_PROGRAM === 'iTerm.app') return true; // iTerm2
  if (process.env.KONSOLE_VERSION) return true; // Konsole
  if (process.env.GNOME_TERMINAL_SCREEN) return true; // GNOME Terminal

  // Force color can enable it
  if (process.env.FORCE_COLOR === '3') return true;

  return false;
})();

// Basic ANSI color helper
const color = (code: string) => (text: string) =>
  isColorSupported ? `\x1b[${code}m${text}\x1b[0m` : text;

// RGB color with fallback to basic ANSI
const rgb =
  (r: number, g: number, b: number, fallbackCode: string) => (text: string) => {
    if (!isColorSupported) return text;
    if (isTrueColorSupported) {
      return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
    }
    // Fallback to basic ANSI color
    return `\x1b[${fallbackCode}m${text}\x1b[0m`;
  };

// RGB background color with fallback
const bgRgb =
  (r: number, g: number, b: number, fallbackCode: string) => (text: string) => {
    if (!isColorSupported) return text;
    if (isTrueColorSupported) {
      return `\x1b[48;2;${r};${g};${b}m${text}\x1b[0m`;
    }
    return `\x1b[${fallbackCode}m${text}\x1b[0m`;
  };

/**
 * Create a foreground color from hex code with fallback
 * @param hexCode - Hex color code (e.g., '#ff5733' or 'ff5733')
 * @param fallbackCode - Basic ANSI code to use if RGB not supported (default: '37' white)
 */
const hex = (hexCode: string, fallbackCode = '37') => {
  const h = hexCode.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return rgb(r, g, b, fallbackCode);
};

/**
 * Create a background color from hex code with fallback
 */
const bgHex = (hexCode: string, fallbackCode = '40') => {
  const h = hexCode.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return bgRgb(r, g, b, fallbackCode);
};

/** Color utilities for CLI output */
export const colors = {
  // Basic ANSI colors (always work)
  red: color('31'),
  green: color('32'),
  yellow: color('33'),
  blue: color('34'),
  magenta: color('35'),
  cyan: color('36'),
  white: color('37'),

  // Bright colors
  brightRed: color('91'),
  brightGreen: color('92'),
  brightYellow: color('93'),
  brightCyan: color('96'),

  // Styles
  bold: color('1'),
  dim: color('2'),
  italic: color('3'),
  underline: color('4'),

  // Background
  bgRed: color('41'),
  bgGreen: color('42'),
  bgYellow: color('43'),

  // 🌈 RGB Functions (with fallback parameter)
  rgb,
  bgRgb,
  hex,
  bgHex,

  // 🎨 Beautiful preset RGB colors with ANSI fallbacks
  orange: rgb(255, 165, 0, '33'), // fallback: yellow
  pink: rgb(255, 105, 180, '35'), // fallback: magenta
  purple: rgb(138, 43, 226, '35'), // fallback: magenta
  lime: rgb(50, 205, 50, '92'), // fallback: bright green
  coral: rgb(255, 127, 80, '91'), // fallback: bright red
  teal: rgb(0, 128, 128, '36'), // fallback: cyan
  gold: rgb(255, 215, 0, '93'), // fallback: bright yellow
  salmon: rgb(250, 128, 114, '91'), // fallback: bright red
  violet: rgb(238, 130, 238, '35'), // fallback: magenta
  turquoise: rgb(64, 224, 208, '96'), // fallback: bright cyan
  crimson: rgb(220, 20, 60, '91'), // fallback: bright red
  indigo: rgb(75, 0, 130, '34'), // fallback: blue
  skyBlue: rgb(135, 206, 235, '96'), // fallback: bright cyan
  mintGreen: rgb(152, 255, 152, '92'), // fallback: bright green
  peach: rgb(255, 218, 185, '93'), // fallback: bright yellow

  // 🔥 Gradient-style presets with fallbacks
  fire: rgb(255, 69, 0, '91'), // fallback: bright red
  ocean: rgb(0, 119, 190, '34'), // fallback: blue
  forest: rgb(34, 139, 34, '32'), // fallback: green
  sunset: rgb(255, 99, 71, '91'), // fallback: bright red
  aurora: rgb(147, 112, 219, '35'), // fallback: magenta

  // Utility to check support
  isTrueColorSupported,
  isColorSupported,
};

// ============================================
// 🔧 Helper Functions
// ============================================

/**
 * Get the developer's name (tries git config first, falls back to OS username)
 */
export function getDeveloperName(): string {
  try {
    const gitName = execSync('git config user.name', { encoding: 'utf-8' })
      .toString()
      .trim();
    if (gitName) return gitName;
  } catch {
    // Git not available or no user.name set
  }
  return os.userInfo().username;
}

/**
 * Get the current environment name
 */
export function getEnvironment(): string {
  return process.env.NODE_ENV || 'development';
}

/**
 * Display a confirmation prompt for dangerous operations
 *
 * @param message - The warning message to display
 * @param options - Configuration options
 * @returns Promise<boolean> - true if user confirms, false otherwise
 *
 * @example
 * const ok = await confirmDanger('This will DELETE the entire database. Continue?');
 * if (!ok) process.exit(0);
 */
export async function confirmDanger(
  message: string,
  options: {
    defaultNo?: boolean;
    showEnvironment?: boolean;
    showUsername?: boolean;
  } = {},
): Promise<boolean> {
  const {
    defaultNo = true,
    showEnvironment = true,
    showUsername = true,
  } = options;

  const username = showUsername ? getDeveloperName() : '';
  const env = showEnvironment
    ? colors.cyan(`[${getEnvironment().toUpperCase()}]`)
    : '';

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const greeting = showUsername
    ? `Hey ${colors.bold(colors.green(username))}, `
    : '';
  const envPrefix = showEnvironment ? `${env} ` : '';
  const suffix = defaultNo ? colors.dim('(y/N)') : colors.dim('(Y/n)');

  const warningIcon = colors.yellow('⚠️');
  const prompt = `\n${warningIcon}  ${envPrefix}${greeting}${colors.yellow(message)} ${suffix}: `;

  return new Promise<boolean>((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();

      const value = answer.trim().toLowerCase();

      // If empty answer, use the default
      if (!value) {
        resolve(!defaultNo);
        return;
      }

      resolve(value === 'y' || value === 'yes');
    });
  });
}

/**
 * Require the user to type a specific word to confirm an action
 * This is for extremely dangerous operations
 *
 * @param message - The warning message to display
 * @param confirmWord - The word the user must type to confirm
 * @returns Promise<boolean> - true if user types the correct word
 *
 * @example
 * const ok = await confirmWithWord('reset database', 'RESET');
 * if (!ok) process.exit(0);
 */
export async function confirmWithWord(
  message: string,
  confirmWord: string,
): Promise<boolean> {
  const username = getDeveloperName();
  const env = getEnvironment().toUpperCase();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(
    `\n${colors.yellow('⚠️')}  ${colors.cyan(`[${env}]`)} Hey ${colors.bold(colors.green(username))}, ${colors.yellow(message)}`,
  );
  console.log(
    `\n${colors.magenta('🔐')} Type "${colors.bold(colors.red(confirmWord))}" to continue (or anything else to cancel):`,
  );

  return new Promise<boolean>((resolve) => {
    rl.question(colors.cyan('> '), (answer) => {
      rl.close();
      resolve(answer.trim() === confirmWord);
    });
  });
}

/**
 * Block execution if running in production environment
 * @param operationName - Name of the operation being blocked
 */
export function blockInProduction(operationName: string): void {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      `\n${colors.red('❌')} ${colors.bold(colors.red(`Cannot ${operationName} in production environment!`))}`,
    );
    console.error(
      colors.dim('   This operation is blocked for safety reasons.\n'),
    );
    process.exit(1);
  }
}

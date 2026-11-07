<!--
SNAPSHOT  DOCS/sdk/tauri-cli-2.11.4/RpmConfig.md
source:   node_modules/@tauri-apps/cli/config.schema.json (definitions.RpmConfig, definitions.RpmCompression, definitions.LinuxConfig.properties.rpm) of the published @tauri-apps/cli 2.11.4 npm package
fetched:  2026-11-06 (extracted from the installed npm package, verbatim JSON)
version:  @tauri-apps/cli 2.11.4
license:  Apache-2.0 OR MIT

Everything below this header is the upstream schema text unchanged.
Do not edit by hand: re-snapshot on a Tauri CLI version bump.
-->

# Tauri CLI 2.11.4 — `bundle.linux.rpm` (RpmConfig)

Cited by `src-tauri/tauri.conf.json` `bundle.linux.rpm` and `scripts/release-stage-outputs.mjs` (RPM identity, L-release §2.8).

## LinuxConfig.properties.rpm

```json
{
  "description": "Configuration for the RPM bundle.",
  "default": {
    "epoch": 0,
    "files": {},
    "release": "1"
  },
  "allOf": [
    {
      "$ref": "#/definitions/RpmConfig"
    }
  ]
}
```

## RpmConfig

```json
{
  "description": "Configuration for RPM bundles.",
  "type": "object",
  "properties": {
    "depends": {
      "description": "The list of RPM dependencies your application relies on.",
      "type": [
        "array",
        "null"
      ],
      "items": {
        "type": "string"
      }
    },
    "recommends": {
      "description": "The list of RPM dependencies your application recommends.",
      "type": [
        "array",
        "null"
      ],
      "items": {
        "type": "string"
      }
    },
    "provides": {
      "description": "The list of RPM dependencies your application provides.",
      "type": [
        "array",
        "null"
      ],
      "items": {
        "type": "string"
      }
    },
    "conflicts": {
      "description": "The list of RPM dependencies your application conflicts with. They must not be present\n in order for the package to be installed.",
      "type": [
        "array",
        "null"
      ],
      "items": {
        "type": "string"
      }
    },
    "obsoletes": {
      "description": "The list of RPM dependencies your application supersedes - if this package is installed,\n packages listed as \"obsoletes\" will be automatically removed (if they are present).",
      "type": [
        "array",
        "null"
      ],
      "items": {
        "type": "string"
      }
    },
    "release": {
      "description": "The RPM release tag.",
      "default": "1",
      "type": "string"
    },
    "epoch": {
      "description": "The RPM epoch.",
      "default": 0,
      "type": "integer",
      "format": "uint32",
      "minimum": 0
    },
    "files": {
      "description": "The files to include on the package.",
      "default": {},
      "type": "object",
      "additionalProperties": {
        "type": "string"
      }
    },
    "desktopTemplate": {
      "description": "Path to a custom desktop file Handlebars template.\n\n Available variables: `categories`, `comment` (optional), `exec`, `icon` and `name`.",
      "type": [
        "string",
        "null"
      ]
    },
    "preInstallScript": {
      "description": "Path to script that will be executed before the package is unpacked. See\n <http://ftp.rpm.org/max-rpm/s1-rpm-inside-scripts.html>",
      "type": [
        "string",
        "null"
      ]
    },
    "postInstallScript": {
      "description": "Path to script that will be executed after the package is unpacked. See\n <http://ftp.rpm.org/max-rpm/s1-rpm-inside-scripts.html>",
      "type": [
        "string",
        "null"
      ]
    },
    "preRemoveScript": {
      "description": "Path to script that will be executed before the package is removed. See\n <http://ftp.rpm.org/max-rpm/s1-rpm-inside-scripts.html>",
      "type": [
        "string",
        "null"
      ]
    },
    "postRemoveScript": {
      "description": "Path to script that will be executed after the package is removed. See\n <http://ftp.rpm.org/max-rpm/s1-rpm-inside-scripts.html>",
      "type": [
        "string",
        "null"
      ]
    },
    "compression": {
      "description": "Compression algorithm and level. Defaults to `Gzip` with level 6.",
      "anyOf": [
        {
          "$ref": "#/definitions/RpmCompression"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "additionalProperties": false
}
```

## RpmCompression

```json
{
  "description": "Compression algorithms used when bundling RPM packages.",
  "oneOf": [
    {
      "description": "Gzip compression",
      "type": "object",
      "required": [
        "level",
        "type"
      ],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "gzip"
          ]
        },
        "level": {
          "description": "Gzip compression level",
          "type": "integer",
          "format": "uint32",
          "minimum": 0
        }
      },
      "additionalProperties": false
    },
    {
      "description": "Zstd compression",
      "type": "object",
      "required": [
        "level",
        "type"
      ],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "zstd"
          ]
        },
        "level": {
          "description": "Zstd compression level",
          "type": "integer",
          "format": "int32"
        }
      },
      "additionalProperties": false
    },
    {
      "description": "Xz compression",
      "type": "object",
      "required": [
        "level",
        "type"
      ],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "xz"
          ]
        },
        "level": {
          "description": "Xz compression level",
          "type": "integer",
          "format": "uint32",
          "minimum": 0
        }
      },
      "additionalProperties": false
    },
    {
      "description": "Bzip2 compression",
      "type": "object",
      "required": [
        "level",
        "type"
      ],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "bzip2"
          ]
        },
        "level": {
          "description": "Bzip2 compression level",
          "type": "integer",
          "format": "uint32",
          "minimum": 0
        }
      },
      "additionalProperties": false
    },
    {
      "description": "Disable compression",
      "type": "object",
      "required": [
        "type"
      ],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "none"
          ]
        }
      },
      "additionalProperties": false
    }
  ]
}
```

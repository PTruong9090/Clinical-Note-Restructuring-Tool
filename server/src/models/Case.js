import { DataTypes } from "sequelize";
import { sequelize } from "../db/sequelize.js";

export const Case = sequelize.define(
  "Case",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    erNote: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ""
    },
    hpNote: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ""
    },
    combinedNote: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    generatedStructuredResult: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    editedStructuredResult: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    generatedRevisedHpi: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    editedRevisedHpi: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    hasUserEdits: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    tableName: "cases"
  }
);

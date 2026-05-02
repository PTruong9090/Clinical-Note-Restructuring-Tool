import { DataTypes } from "sequelize";

export async function up(queryInterface) {
  await queryInterface.createTable("cases", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
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
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  await queryInterface.addIndex("cases", ["updatedAt"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("cases");
}

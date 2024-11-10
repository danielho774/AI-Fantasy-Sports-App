//File: example/example-node.ts

import { z } from "zod";
import axios from "axios";

import {
    defineDAINService,
    ToolConfig,
    ServiceConfig,
    ToolboxConfig,
    ServiceContext,
  } from "@dainprotocol/service-sdk";

const getRecipeConfig: ToolConfig = {
    id: "get-recipe",
    name: "Get Recipe",
    description: "Fetches a recipe by name from TheMealDB API",
    input: z
      .object({
        name: z.string().describe("Recipe name"),
      })
      .describe("Input parameters for the recipe request"),
    output: z
      .object({
        name: z.string().describe("Recipe name"),
        ingredients: z.array(z.string()).describe("List of ingredients"),
        instructions: z.array(z.string()).describe("List of instructions"),
      })
      .describe("Recipe data"),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async ({ name }, agentInfo) => {
        console.log('User / Agent ${agentInfo.id} requested recipe for ${name}');
      
        const response = await axios.get(
          `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(name)}`
        );
      
        const recipe = response.data.meals[0]; // Note: The API returns 'meals', not 'results'
      
        // Prepare the data
        const recipeData = {
          name: recipe.strMeal,
          ingredients: Object.keys(recipe)
            .filter(key => key.startsWith('strIngredient') && recipe[key])
            .map(key => `${recipe[key]} - ${recipe[`strMeasure${key.slice(13)}`]}`),
          instructions: recipe.strInstructions.split('\n').filter(step => step.trim() !== '')
        };
      
        // Prepare the UI
        const uiData = {
          type: "card",
          uiData: JSON.stringify({
            title: recipeData.name,
            content: `Ingredients: ${recipeData.ingredients.length}\nSteps: ${recipeData.instructions.length}`
          })
        };
      
        return {
          text: 'Found recipe for ${name}. It has ${recipeData.ingredients.length} ingredients and ${recipeData.instructions.length} steps.',
          data: recipeData,
          ui: uiData
        };
    },
};

const suggestRandomRecipeConfig: ToolConfig = {
    id: "suggest-random-recipe",
    name: "Suggest Random Recipe",
    description: "Fetches a random recipe from TheMealDB API",
    input: z.undefined().describe("No input parameters"),
    output: z
      .object({
        name: z.string().describe("Recipe name"),
        ingredients: z.array(z.string()).describe("List of ingredients"),
        instructions: z.array(z.string()).describe("List of instructions"),
      })
      .describe("Recipe data"),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async (_, agentInfo) => {
        console.log('User / Agent ${agentInfo.id} requested a random recipe');
      
        const response = await axios.get(
          `https://www.themealdb.com/api/json/v1/1/random.php`
        );
      
        const recipe = response.data.meals[0]; // Note: The API returns 'meals', not 'results'
      
        // Prepare the data
        const recipeData = {
          name: recipe.strMeal,
          ingredients: Object.keys(recipe)
            .filter(key => key.startsWith('strIngredient') && recipe[key])
            .map(key => `${recipe[key]} - ${recipe[`strMeasure${key.slice(13)}`]}`),
          instructions: recipe.strInstructions.split('\n').filter(step => step.trim() !== '')
        };
      
        // Prepare the UI
        const uiData = {
          type: "card",
          uiData: JSON.stringify({
            title: recipeData.name,
            content: `Ingredients: ${recipeData.ingredients.length}\nSteps: ${recipeData.instructions.length}`
          })
        };
      
        return {
          text: 'Found recipe for ${recipeData.name}. It has ${recipeData.ingredients.length} ingredients and ${recipeData.instructions.length} steps.',
          data: recipeData,
          ui: uiData
        };
    },
};

const filterRecipesConfig: ToolConfig = {
    id: "filter-recipes",
    name: "Filter Recipes",
    description: "Filters recipes by main ingredient, category, or area",
    input: z.object({
      filterType: z.enum(["ingredient", "category", "area"]).describe("Type of filter to apply"),
      filterValue: z.string().describe("Value to filter by (e.g., 'chicken_breast', 'Seafood', 'Canadian')")
    }).describe("Input parameters for recipe filtering"),
    output: z.array(z.object({
      id: z.string(),
      name: z.string(),
      thumbnail: z.string()
    })).describe("List of filtered recipes"),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async ({ filterType, filterValue }, agentInfo) => {
      console.log(`User / Agent ${agentInfo.id} filtered recipes by ${filterType}: ${filterValue}`);
  
      let endpoint;
      switch (filterType) {
        case "ingredient":
          endpoint = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(filterValue)}`;
          break;
        case "category":
          endpoint = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(filterValue)}`;
          break;
        case "area":
          endpoint = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(filterValue)}`;
          break;
      }
  
      const response = await axios.get(endpoint);
      const recipes = response.data.meals || [];
  
      const filteredRecipes = recipes.map((recipe: any) => ({
        id: recipe.idMeal,
        name: recipe.strMeal,
        thumbnail: recipe.strMealThumb
      }));
  
      // Prepare the UI
      const uiData = {
        type: "card",
        uiData: JSON.stringify({
          title: `Recipes filtered by ${filterType}: ${filterValue}`,
          content: `Found ${filteredRecipes.length} recipes.`
        }),
        children: [
          {
            type: "table",
            uiData: JSON.stringify({
              columns: [
                { key: "name", header: "Recipe Name", width: "70%" },
                { key: "thumbnail", header: "Image", width: "30%", type: "image" }
              ],
              rows: filteredRecipes.map(recipe => ({
                name: recipe.name,
                thumbnail: recipe.thumbnail
              }))
            })
          }
        ]
      };
  
      return {
        text: `Found ${filteredRecipes.length} recipes filtered by ${filterType}: ${filterValue}.`,
        data: filteredRecipes,
        ui: uiData
      };
    },
};

const dainService = defineDAINService({
    metadata: {
      title: "Recipe Service",
      description:
        "A DAIN service that provides the ingreidents and instructions for a specified recipe",
      version: "1.0.0",
      author: "Your Name",
      tags: ["recipe", "ingredient", "dain", "food"],
    },
    identity: {
      apiKey: process.env.DAIN_API_KEY,
    },
    tools: [getRecipeConfig, suggestRandomRecipeConfig, filterRecipesConfig],
  });
  
dainService.startNode({ port: 2022 }).then(() => {
    console.log("Recipe DAIN Service is running on port 2022");
});
  
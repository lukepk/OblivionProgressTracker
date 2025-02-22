"use strict"
//This file contains functions that load static data, both reference data from Oblivion
// and guide-specific things, like UESP links and notes.
// This file also contains utility functions for navigating through this data.

var jsondata = {quest:null,book:null,skill:null,store:null}

var totalweight;

//Object that represents a type of json data.
//eg., "quest","book", etc.
function JsonClass(name,shouldSave = false, isStandard = false, completionWeight = 0){
	//name of this class (used for property access n stuff)
	this.name = name;
	
	// should this class be included in save data?
	// false for classes with no user input (eg., npcs)
	this.shouldSave = shouldSave;
		
	//in order to be "standard", all elements of this class must
	//1) be a boolean property (so no "nirnroots collected")
	//2) have a sequential numeric id (so no id="fame")
	this.standard = isStandard;
	
	//default weight for this class in completion.
	// can be overridden in weight calculation later.
	this.weight = completionWeight;
}

const classes = [
	new JsonClass("quest",true,true),
	new JsonClass("book",true,true),
	new JsonClass("skill",true,true,15),//v1 so we have to include weight
	new JsonClass("store",true,true),
	new JsonClass("misc",true),
	new JsonClass("save",true),
	new JsonClass("npc",false)
];

// classes that have a standard layout and can use most of the generic functions.
function standardClasses(){
	return classes.filter(x=>x.standard).map(x=>x.name);
}

//only classes that can be changed (and thus should be saved)
// contribute to progress
const progressClasses = classes.filter(c=>c.shouldSave);

//loads the "hives" (called that because they resemble windows registry hives)
// into the "jsondata" variable.
function loadJsonData(basedir=".",classFilter=(x=>true)){
	var promises = [];
	for(var klass of classes){
		if(classFilter(klass)){
			promises.push(generatePromiseFunc(basedir,klass));
		}
	}
	return Promise.allSettled(promises).then(()=>computeTotalWeight());
}

//returns an async function that fetches a json file and merges
// required data.
// this needs to be a separate func because byref closure shenanigans
function generatePromiseFunc(basedir, klass){
	return fetch(basedir+"/data/"+klass.name+".json")
			.then(resp=>resp.json())
			.then(hive=>mergeData(hive,basedir))
			.then(hive=>{
				jsondata[klass.name] = hive;
				console.log(klass.name+" loaded");
			})
			.catch(err =>console.log(err));
}

//imma call single leaf nodes "cells" because its memorable
function mergeCell(mapping){
	return (cell =>{
		cell.id = mapping.find(x=>x.formId == cell.formId).id;
	});
}

//turn a bunch of json data from different files into a single js object.
async function mergeData(hive, basedir="."){
	if(hive.version >= 3){
		//jsonTree is by formId. load IDs.
		try{
			const mapFilename = "mapping_"+hive.name.toLowerCase()+"_v"+hive.version+".json";
			const mapJson = await fetch(basedir+"/data/"+mapFilename).then(resp=>resp.json());
			runOnTree(hive, mergeCell(mapJson));
			console.log("merged "+hive.name);
		}
		catch{}//there may not be any other data, so just continue in that case.
	}
	return hive;
}

//compute total weight. Needed so we can get a percentage.
function computeTotalWeight(){
	totalweight = 0;
	for(const klass of progressClasses){
		try{
			const hive = jsondata[klass.name];
			if(hive == null){
				// class data not loaded
				continue;
			}
			if(hive.version >= 2){
				totalweight += runOnTree(hive,(e=>parseInt(e.weight)),0,(e=>e.weight != null));
			}
			else{
				totalweight += klass.weight;
			}
		}
		catch (err){
			console.error("Problem computing weight for class "+klass.name+": "+err);
		}
	}	
}

//========================
// Utility functions
//========================

//is node.elements undefined or null?
function elementsUndefinedOrNull(node){
	// in JS, undefined == null (but not undefined === null)
	return (node.elements == null);
}

//find an element of the tree.
//root: root node to run on
//findfunc: function that returns 'true' if element matches.
function findOnTree(root,findfunc,isLeafFunc=elementsUndefinedOrNull){
	if(isLeafFunc(root)){
		if(findfunc(root)){
			return root;
		}
		else{
			return null;
		}
	}
	else{
		if(root?.elements == null){
			debugger;
		}
		for(const e of root.elements){
			const mayberesult = findOnTree(e, findfunc, isLeafFunc);
			if(!(mayberesult == null)){
				return mayberesult;
			}
		}
	}
}

//run a function on leaves in a tree and sum the results.
//rootNode: root node to run on
//runFunc: function to run on leaves
//startVal: starting value of result
//isLeafFunc: function to determine if leaf. default is elements prop null or undefined.
function runOnTree(rootNode, runFunc, startVal, isLeafFunc=elementsUndefinedOrNull){
	var newval = startVal;
	if(isLeafFunc(rootNode)){
		newval += runFunc(rootNode);
	}
	else{
		for(const node of rootNode.elements){
			newval = runOnTree(node,runFunc,newval,isLeafFunc);
		}
	}
	return newval;
}
/*
 * Copyright 2016 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(function(require) {
	'use strict';
    
	var joint = require('joint');
	var app = require('flo');
	
	app.factory('sample-editor-service', [function() {
		
	       function createHandles(flo, createHandle, element) {
	            var bbox = element.getBBox();
	            var pt = bbox.origin().offset(bbox.width + 3, bbox.height + 3);
	            createHandle(element, 'remove', flo.deleteSelectedNode, pt);
	        }

	        function validatePort(/*flo, cellView, magnet*/) {
	            return true;
	        }

	        function validateLink(flo, cellViewS, magnetS, cellViewT, magnetT, end, linkView) { // jshint ignore:line
	            // Prevent linking from input ports.
	            if (magnetS && magnetS.getAttribute('type') === 'input') {
	                return false;
	            }
	            // Prevent linking from output ports to input ports within one element.
	            if (cellViewS === cellViewT) {
	                return false;
	            }
	            // Prevent linking to input ports.
	            if (magnetT && magnetT.getAttribute('type') === 'output') {
	                return false;
	            }
//	            var message = validateLinkEdit(flo.getGraph(), (cellViewS ? cellViewS.model : null), (cellViewT ? cellViewT.model : null), linkView.model, end);
//	            return !message;
	            return cellViewS.model && cellViewT.model && !(cellViewS.model instanceof joint.shapes.flo.ErrorDecoration) && !(cellViewT.model instanceof joint.shapes.flo.ErrorDecoration);
	        }

//	        function validateLinkEdit(graph, source, target, link, end) {
//	            var newOutgoing = 0, newIncoming = 0;
//	            if (end === 'source') {
//	                newOutgoing = 1;
//	            } else if (end === 'target') {
//	                newIncoming = 1;
//	            } else if (end === 'addition') {
//	                newOutgoing = 1;
//	                newIncoming = 1;
//	            } else if (end === 'deletion') {
//	                newOutgoing = -1;
//	                newIncoming = -1;
//	            }
//	            var outboundLinks = graph.getConnectedLinks(source, { outbound: true });
//	            var inboundLinks = graph.getConnectedLinks(source, { inbound: true });
//	            var sourceMaxOutgoingLinksNumber = source.attr('metadata/constraints/maxOutgoingLinksNumber');
//	            var sourceMinOutgoingLinksNumber = source.attr('metadata/constraints/minOutgoingLinksNumber');
//	            var targetMaxIncomingLinksNumber = target.attr('metadata/constraints/maxIncomingLinksNumber');
//	            var targetMinIncomingLinksNumber = target.attr('metadata/constraints/minIncomingLinksNumber');
//	            if (typeof sourceMaxOutgoingLinksNumber === 'number' && sourceMaxOutgoingLinksNumber < outboundLinks.length + newOutgoing) {
//	                return 'Source cannot have more than ' + sourceMaxOutgoingLinksNumber + ' outgoing links';
//	            }
//	            if (typeof sourceMinOutgoingLinksNumber === 'number' && sourceMinOutgoingLinksNumber < outboundLinks.length + newOutgoing) {
//	                return 'Source cannot have less than ' + sourceMinOutgoingLinksNumber + ' outgoing links';
//	            }
//	            if (typeof targetMaxIncomingLinksNumber === 'number' && targetMaxIncomingLinksNumber < inboundLinks.length + newIncoming) {
//	                return 'Target cannot have more than ' + targetMaxIncomingLinksNumber + ' incoming links';
//	            }
//	            if (typeof targetMinIncomingLinksNumber === 'number' && targetMinIncomingLinksNumber < outboundLinks.length + newIncoming) {
//	                return 'Source cannot have less than ' + targetMinIncomingLinksNumber + ' incoming links';
//	            }
//	        }
        
	        function repairDamage(flo, node) {
	            /*
	             * remove incoming, outgoing links and cache their sources and targets not equal to current node
	             */
	            var sources = [];
	            var targets = [];
	            var i = 0;
	            var links = flo.getGraph().getConnectedLinks(node);
	            for (i = 0; i < links.length; i++) {
	                var targetId = links[i].get('target').id;
	                var sourceId = links[i].get('source').id;
	                if (targetId === node.id) {
	                    links[i].remove();
	                    sources.push(sourceId);
	                } else if (sourceId === node.id) {
	                    links[i].remove();
	                    targets.push(targetId);
	                }
	            }
	            /*
	             * best attempt to connect source and targets bypassing the node
	             */
	            if (sources.length === 1) {
	                var source = sources[0];
	                for (i = 0; i < targets.length; i++) {
	                    flo.createLink({
	                        'id': source,
	                        'selector': '.output-port'
	                    }, {
	                        'id': targets[i],
	                        'selector': '.input-port'
	                    });
	                }
	            } else if (targets.length === 1) {
	                var target = targets[0];
	                for (i = 0; i < sources.length; i++) {
	                    flo.createLink({
	                        'id': sources[i],
	                        'selector': '.output-port'
	                    }, {
	                        'id': target,
	                        'selector': '.input-port'
	                    });
	                }
	            }
	        }

	        function preDelete(flo, cell) {
	            repairDamage(flo, cell);
	        }

	        /**
	         * Check if node being dropped and drop target node next to each other such that they won't be swapped by the drop
	         */
	        function canSwap(flo, dropee, target, side) {
	            var i, targetId, sourceId, noSwap = (dropee.id === target.id);
	            if (dropee === target) {
	                console.log('What!??? Dragged == Dropped!!! id = ' + target);
	            }
	            var links = flo.getGraph().getConnectedLinks(dropee);
	            for (i = 0; i < links.length && !noSwap; i++) {
	                targetId = links[i].get('target').id;
	                sourceId = links[i].get('source').id;
	                noSwap = (side === 'left' && targetId === target.id && sourceId === dropee.id) || (side === 'right' && targetId === dropee.id && sourceId === target.id);
	            }
	            return !noSwap;
	        }
        
	        function moveNodeOnNode(flo, node, pivotNode, side, shouldRepairDamage) {
	            side = side || 'left';
	            if (canSwap(flo, node, pivotNode, side)) {
	                var link;
	                var i;
	                if (side === 'left') {
	                    var sources = [];
	                    if (shouldRepairDamage) {
	                        /*
	                         * Commented out because it doesn't prevent cycles.
	                         */
//							if (graph.getConnectedLinks(pivotNode, {inbound: true}).length > 0 || graph.getConnectedLinks(node, {outbound: true}).length > 0) {
	                        repairDamage(flo, node);
//							}
	                    }
	                    var pivotTargetLinks = flo.getGraph().getConnectedLinks(pivotNode, {inbound: true});
	                    for (i = 0; i < pivotTargetLinks.length; i++) {
	                        link = pivotTargetLinks[i];
	                        sources.push(link.get('source').id);
	                        link.remove();
	                    }
	                    for (i = 0; i < sources.length; i++) {
	                        flo.createLink({
	                            'id': sources[i],
	                            'selector': '.output-port'
	                        }, {
	                            'id': node.id,
	                            'selector': '.input-port'
	                        });
	                    }
	                    flo.createLink({
	                        'id': node.id,
	                        'selector': '.output-port'
	                    }, {
	                        'id': pivotNode.id,
	                        'selector': '.input-port'
	                    });
	                } else if (side === 'right') {
	                    var targets = [];
	                    if (shouldRepairDamage) {
	                        /*
	                         * Commented out because it doesn't prevent cycles.
	                         */
//							if (graph.getConnectedLinks(pivotNode, {outbound: true}).length > 0 || graph.getConnectedLinks(node, {inbound: true}).length > 0) {
	                        repairDamage(flo, node);
//							}
	                    }
	                    var pivotSourceLinks = flo.getGraph().getConnectedLinks(pivotNode, {outbound: true});
	                    for (i = 0; i < pivotSourceLinks.length; i++) {
	                        link = pivotSourceLinks[i];
	                        targets.push(link.get('target').id);
	                        link.remove();
	                    }
	                    for (i = 0; i < targets.length; i++) {
	                        flo.createLink({
	                            'id': node.id,
	                            'selector': '.output-port'
	                        }, {
	                            'id': targets[i],
	                            'selector': '.input-port'
	                        });
	                    }
	                    flo.createLink({
	                        'id': pivotNode.id,
	                        'selector': '.output-port'
	                    }, {
	                        'id': node.id,
	                        'selector': '.input-port'
	                    });
	                }
	            }
	        }

	        function moveNodeOnLink(flo, node, link, shouldRepairDamage) {
	            var source = link.get('source').id;
	            var target = link.get('target').id;

	            if (shouldRepairDamage) {
	                repairDamage(flo, node);
	            }
	            link.remove();

	            if (source) {
	                flo.createLink({
	                    'id': source,
	                    'selector': '.output-port'
	                }, {
	                    'id': node.id,
	                    'selector': '.input-port'
	                });
	            }
	            if (target) {
	                flo.createLink({
	                    'id': node.id,
	                    'selector': '.output-port'
	                }, {
	                    'id': target,
	                    'selector': '.input-port'
	                });
	            }
	        }

	        function handleNodeDropping(flo, dragDescriptor) {
	            var relinking = dragDescriptor.context && dragDescriptor.context.palette;
	            var graph = flo.getGraph();
	            var source = dragDescriptor.source ? dragDescriptor.source.cell : undefined;
	            var target = dragDescriptor.target ? dragDescriptor.target.cell : undefined;
	            if (target instanceof joint.dia.Element && target.attr('metadata/name')) { // jshint ignore:line
	                var type = source.attr('metadata/name');
	                if (type === 'tap') {
	                    // Fill in the channel on the new node
	                    // work out tap name, something like: tap:stream:mystream.filter (filter optional if on head of stream)
	                    // 1. work your way back from node that was dropped on to the first node (the one with no further links)
	                    var oncell = target;
	                    var headerCell = oncell;
	                    var incomingLinks = graph.getConnectedLinks(oncell, { inbound: true });
	                    while (incomingLinks.length !== 0) {
	                        headerCell = graph.getCell(incomingLinks[0].get('source').id);
	                        incomingLinks = graph.getConnectedLinks(headerCell, { inbound: true });
	                    }
	                    var streamname = 'STREAM';
	                    if (headerCell.attr('stream-name')) {
	                        streamname = headerCell.attr('stream-name');
	                    }
	                    else {
	                        var streamId = headerCell.attr('stream-id');
	                        if (streamId) {
	                            streamname = 'STREAM'+streamId;
	                        } else {
	                            streamname = 'STREAM';
	                        }
	                        headerCell.attr('stream-name',streamname);
	                    }
	                    var channel = 'tap:stream:'+streamname;
	                    var label2 = 'tap:stream:\n' + streamname;
	                    if (oncell.id !== headerCell.id) {
	                        channel = channel + '.' + oncell.attr('.label/text');
	                        label2 = label2 + '.' + oncell.attr('.label/text');
	                    }
	                    source.attr('.label2/text', label2);
	                    source.attr('props/channel', channel);
	                    relinking = true;
	                } else {
	                    if (dragDescriptor.target.selector === '.output-port') {
	                        moveNodeOnNode(flo, source, target, 'right', true);
	                        relinking = true;
	                    } else if (dragDescriptor.target.selector === '.input-port') {
	                        moveNodeOnNode(flo, source, target, 'left', true);
	                        relinking = true;
	                    }
	                }
	            } else if (target instanceof joint.dia.Link) { // jshint ignore:line
	                moveNodeOnLink(flo, source, target);
	                relinking = true;
	            }
	            // Turn off auto layout
//	            if (relinking) {
//	                flo.performLayout();
//	            }
	        }

	        function calculateDragDescriptor(flo, draggedView, targetUnderMouse, point, context) {
	            // check if it's a tap being dragged
	            var source = draggedView.model;
	            if ((targetUnderMouse instanceof joint.dia.Element) && source.attr('metadata/name') === 'tap') { // jshint ignore:line
	                return {
	                    context: context,
	                    source: {
	                        cell: draggedView.model,
	                    },
	                    target: {
	                        cell: targetUnderMouse,
	                    }
	                };
	            }

	            // Find closest port
	            var range = 30;
	            var graph = flo.getGraph();
	            var paper = flo.getPaper();
	            var closestData;
	            var minDistance = Number.MAX_VALUE;
	            var maxIcomingLinks = draggedView.model.attr('metadata/constraints/maxIncomingLinksNumber');
	            var maxOutgoingLinks = draggedView.model.attr('metadata/constraints/maxOutgoingLinksNumber');
	            var hasIncomingPort = typeof maxIcomingLinks !== 'number' || maxIcomingLinks > 0;
	            var hasOutgoingPort = typeof maxOutgoingLinks !== 'number' || maxOutgoingLinks > 0;
	            if (!hasIncomingPort && !hasOutgoingPort) {
	                return;
	            }
	            var elements = graph.findModelsInArea(joint.g.rect(point.x - range, point.y - range, 2 * range, 2 * range)); // jshint ignore:line
	            if (Array.isArray(elements)) {
	                elements.forEach(function(model) {
	                    var view = paper.findViewByModel(model);
	                    if (view && view !== draggedView && model instanceof joint.dia.Element) { // jshint ignore:line
	                        var targetMaxIcomingLinks = view.model.attr('metadata/constraints/maxIncomingLinksNumber');
	                        var targetMaxOutgoingLinks = view.model.attr('metadata/constraints/maxOutgoingLinksNumber');
	                        var targetHasIncomingPort = typeof targetMaxIcomingLinks !== 'number' || targetMaxIcomingLinks > 0;
	                        var targetHasOutgoingPort = typeof targetMaxOutgoingLinks !== 'number' || targetMaxOutgoingLinks > 0;
	                        if (view.model.attr('metadata/constraints/xorSourceSink')) {
	                            if (targetHasIncomingPort) {
	                                targetHasIncomingPort = targetHasIncomingPort && graph.getConnectedLinks(view.model, { outbound: true }).length === 0;
	                            }
	                            if (targetHasOutgoingPort) {
	                                targetHasOutgoingPort = targetHasOutgoingPort && graph.getConnectedLinks(view.model, { inbound: true }).length === 0;
	                            }
	                        }
	                        if (draggedView.model.attr('metadata/constraints/xorSourceSink')) {
	                            if (hasIncomingPort) {
	                                targetHasOutgoingPort = targetHasOutgoingPort && graph.getConnectedLinks(view.model, { outbound: true }).length === 0;
	                            }
	                            if (hasOutgoingPort) {
	                                targetHasIncomingPort = targetHasIncomingPort && graph.getConnectedLinks(view.model, { inbound: true }).length === 0;
	                            }
	                        }
	                        view.$('[magnet]').each(function(index, magnet) {
	                            var type = magnet.getAttribute('type');
	                            if ((type === 'input' && targetHasIncomingPort && hasOutgoingPort) || (type === 'output' && targetHasOutgoingPort && hasIncomingPort)) {
	                                var bbox = joint.V(magnet).bbox(false, paper.viewport); // jshint ignore:line
	                                var distance = point.distance({
	                                    x: bbox.x + bbox.width / 2,
	                                    y: bbox.y + bbox.height / 2
	                                });
	                                if (distance < range && distance < minDistance) {
	                                    minDistance = distance;
	                                    closestData = {
	                                        context: context,
	                                        source: {
	                                            cell: draggedView.model,
	                                            selector: type === 'output' ? '.input-port' : '.output-port'
	                                        },
	                                        target: {
	                                            cell: model,
	                                            selector: '.' + type+'-port'
	                                        },
	                                        range: minDistance
	                                    };
	                                }
	                            }
	                        });
	                    }
	                });
	            }
	            if (closestData) {
	                return closestData;
	            }

	            // Check if drop on a link is allowed
	            if (targetUnderMouse instanceof joint.dia.Link && !(source.attr('metadata/constraints/xorSourceSink') || source.attr('metadata/constraints/maxOutgoingLinksNumber') === 0 || source.attr('metadata/constraints/maxIncomingLinksNumber') === 0) && graph.getConnectedLinks(source).length === 0) { // jshint ignore:line
	                return {
	                    context: context,
	                    source: {
	                        cell: source
	                    },
	                    target: {
	                        cell: targetUnderMouse
	                    }
	                };
	            }
	            
	            return {
                    context: context,
                    source: {
                        cell: source
                    },
	            };
	        }

	        function validateNode(flo, element) {
	            var errors = [];
	            var graph = flo.getGraph();
	            var constraints = element.attr('metadata/constraints');
	            if (constraints) {
	                var incoming = graph.getConnectedLinks(element, {inbound: true});
	                var outgoing = graph.getConnectedLinks(element, {outbound: true});
	                if (typeof constraints.maxIncomingLinksNumber === 'number' || typeof constraints.minIncomingLinksNumber === 'number') {
	                    if (typeof constraints.maxIncomingLinksNumber === 'number' && constraints.maxIncomingLinksNumber < incoming.length) {
	                        if (constraints.maxIncomingLinksNumber === 0) {
	                            errors.push({
	                                message: 'Sources must appear at the start of a stream',
	                                range: element.attr('range')
	                            });
	                        } else {
	                            errors.push({
	                                message: 'Max allowed number of incoming links is ' + constraints.maxIncomingLinksNumber,
	                                range: element.attr('range')
	                            });
	                        }
	                    }
	                    if (typeof constraints.minIncomingLinksNumber === 'number' && constraints.minIncomingLinksNumber > incoming.length) {
	                        errors.push({
	                            message: 'Min allowed number of incoming links is ' + constraints.minIncomingLinksNumber,
	                            range: element.attr('range')
	                        });
	                    }
	                }
	                if (typeof constraints.maxOutgoingLinksNumber === 'number' || typeof constraints.minOutgoingLinksNumber === 'number') {
	                    if (typeof constraints.maxOutgoingLinksNumber === 'number' && constraints.maxOutgoingLinksNumber < outgoing.length) {
	                        if (constraints.maxOutgoingLinksNumber === 0) {
	                            errors.push({
	                                message: 'Sinks must appear at the end of a stream',
	                                range: element.attr('range')
	                            });
	                        } else {
	                            errors.push({
	                                message: 'Max allowed number of outgoing links is ' + constraints.maxOutgoingLinksNumber,
	                                range: element.attr('range')
	                            });
	                        }
	                    }
	                    if (typeof constraints.minOutgoingLinksNumber === 'number' && constraints.minOutgoingLinksNumber > outgoing.length) {
	                        errors.push({
	                            message: 'Min allowed number of outgoing links is ' + constraints.minOutgoingLinksNumber,
	                            range: element.attr('range')
	                        });
	                    }
	                }
	                if (constraints.xorSourceSink && incoming.length && outgoing.length) {
	                    errors.push({
	                        message: 'Node can either have incoming or outgoing links, but not both',
	                        range: element.attr('range')
	                    });
	                }
	            }
	            if (!element.attr('metadata') || element.attr('metadata/unresolved')) {
	                var msg = 'Unknown element \'' + element.attr('metadata/name') + '\'';
	                if (element.attr('metadata/group')) {
	                    msg += ' from group \'' + element.attr('metadata/group') + '\'.';
	                }
	                errors.push({
	                    message: msg,
	                    range: element.attr('range')
	                });
	            }

	            // If possible, verify the properties specified match those allowed on this type of element
	            // propertiesRanges are the ranges for each property included the entire '--name=value'.
	            // The format of a range is {'start':{'ch':NNNN,'line':NNNN},'end':{'ch':NNNN,'line':NNNN}}
	            var propertiesRanges = element.attr('propertiesranges');
	            if (propertiesRanges) {
	                var moduleSchema = element.attr('metadata');
	                // Grab the list of supported properties for this module type
	                moduleSchema.get('properties').then(function(moduleSchemaProperties) {
	                    if (!moduleSchemaProperties) {
	                        moduleSchemaProperties = {};
	                    }
	                    // Example moduleSchemaProperties:
	                    // {"host":{"name":"host","type":"String","description":"the hostname of the mail server","defaultValue":"localhost","hidden":false},
	                    //  "password":{"name":"password","type":"String","description":"the password to use to connect to the mail server ","defaultValue":null,"hidden":false}
	                    var specifiedProperties = element.attr('props');
	                    Object.keys(specifiedProperties).forEach(function(propertyName) {
	                        if (!moduleSchemaProperties[propertyName]) {
	                            // The schema does not mention that property
	                            var propertyRange = propertiesRanges[propertyName];
	                            if (propertyRange) {
	                                errors.push({
	                                    message: 'unrecognized option \''+propertyName+'\' for module \''+element.attr('metadata/name')+'\'',
	                                    range: propertyRange
	                                });
	                            }
	                        }
	                    });
	                });
	            }

	            return errors;
	        }

	        return {
	            'createHandles': createHandles,
	            'validatePort': validatePort,
	            'validateLink': validateLink,
	            'calculateDragDescriptor': calculateDragDescriptor,
	            'handleNodeDropping': handleNodeDropping,
	            'validateNode': validateNode,
	            'preDelete': preDelete,
	            'interactive': {
	            	'vertexAdd': false
	            },
	            'allowLinkVertexEdit': false
	        };
	    
	}]);

	return app;

});

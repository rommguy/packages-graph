define(['react', 'lodash', 'zepto', './hello.rt'], function (React, _, $, template) {
    'use strict';

    return React.createClass({
        displayName: 'Hello',
        getInitialState: function () {
            return {
                graphData: null,
                dependenciesData: null,
                selectedPackages: [],
                showRequiredBy: true,
                showRequires: false
            };
        },
        updateControl: function(event, property){
            var state = _.clone(this.state);
            state[property] = event.target.checked;
            this.setState(state);
        },
        getAvailablePackages: function(){
            if (this.state.dependenciesData){
                return _.keys(this.state.dependenciesData);
            }
        },
        packageClicked: function(event, packageName){
            var selectedPackages = _.clone(this.state.selectedPackages);
            if (event.target.checked){
                selectedPackages.push(packageName);
            } else {
                _.remove(selectedPackages, function(value){
                    return value === packageName;
                });
            }
            this.setState({
                selectedPackages: selectedPackages
            });
        },
        componentDidMount: function () {
            $.get('../exampleData.json', function (dependenciesData) {
                this.setState({
                    dependenciesData: dependenciesData
                });
            }.bind(this));
        },
        componentDidUpdate: function(){
                var graphData = this.processData();
                this.drawGraph(graphData);
        },
        processData: function () {
            var jsonData = this.state.dependenciesData;
            var nodes = {};
            var links = [];
            var maxCounter = 0;
            _.forEach(jsonData, function(dependencies, packageName){
                var isSourceSelected =  _.contains(this.state.selectedPackages, packageName);
                nodes[packageName] = nodes[packageName] || {
                    name: packageName,
                    linkCounter: 0
                };
                _.forEach(dependencies, function(counter, targetPackage){
                    var isTargetSelected = _.contains(this.state.selectedPackages, targetPackage);
                    if (((this.state.showRequiredBy && isTargetSelected) || (this.state.showRequires && isSourceSelected))
                        && counter > 0){
                        nodes[targetPackage] = nodes[targetPackage] || {
                            name: targetPackage,
                            linkCounter: 0
                        };
                        var link = {
                            source: nodes[packageName],
                            target: nodes[targetPackage],
                            weight: counter
                        };
                        maxCounter = Math.max(maxCounter, counter);
                        links.push(link);
                        nodes[packageName].linkCounter++;
                        nodes[targetPackage].linkCounter++;
                    }
                }, this);
            }, this);

            nodes = _.omit(nodes, function(nodeData, packageName){
                return nodeData.linkCounter === 0 && !_.contains(this.state.selectedPackages, packageName);
            }, this);

            return {
                nodes: nodes,
                links: links,
                maxWeight: maxCounter
            };
        },
        cleanGraph: function(){
            var graphContainer = this.refs.graphContainer.getDOMNode();
            while (graphContainer.firstChild) {
                graphContainer.removeChild(graphContainer.firstChild);
            }
        },
        drawGraph: function(graphData){
            this.cleanGraph();
            var nodes = graphData.nodes;
            var links = graphData.links;
            var maxWeight = graphData.maxWeight;
            function getOpacity(weight){
                return 0.2 + (weight * 0.8 / maxWeight);
            }

            var width = 960;
            var height = 500;

            var force = d3.layout.force()
                .nodes(d3.values(nodes))
                .links(links)
                .size([width, height])
                .gravity(0.2)
                .linkDistance(150)
                .charge(-1000)
                .on("tick", tick)
                .start();

            var svg = d3.select("#graph-container").append("svg")
                .attr("width", width)
                .attr("height", height);

            // build the arrow.
            svg.append("svg:defs").selectAll("marker")
                .data(["end"])      // Different link/path types can be defined here
                .enter().append("svg:marker")    // This section adds in the arrows
                .attr("id", String)
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 15)
                .attr("refY", -1.5)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto")
                .append("svg:path")
                .attr("d", "M0,-5L10,0L0,5");

            var circle = svg.append("g").selectAll("circle")
                .data(force.nodes())
                .enter().append("circle")
                .attr("r", 9)
                .style('fill', getRandomColor)
                .call(force.drag);

            var text = svg.append("g").selectAll("text")
                .data(force.nodes())
                .enter().append("text")
                .attr("x", 8)
                .attr("y", ".31em")
                .text(function(d) { return d.name; });

            var path = svg.append("g").selectAll("path")
                .data(force.links())
                .enter().append("path")
                .attr("class", function(d) { return "link " + d.type; })
                .style("opacity", function(d){
                        return getOpacity(d.weight);
                    })
                .attr("marker-end", "url(#end)");

            // Use elliptical arc path segments to doubly-encode directionality.
            function tick() {
                path.attr("d", linkArc);
                circle.attr("transform", transform);
                text.attr("transform", transform);
            }

            function linkArc(d) {
                var dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = Math.sqrt(dx * dx + dy * dy);
                return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
            }

            function transform(d) {
                return "translate(" + d.x + "," + d.y + ")";
            }

            function getRandomColor() {
                var letters = '0123456789ABCDEF'.split('');
                var color = '#';
                for (var i = 0; i < 6; i++ ) {
                    color += letters[Math.floor(Math.random() * 16)];
                }
                return color;
            }
        },
        render: template
    });
});

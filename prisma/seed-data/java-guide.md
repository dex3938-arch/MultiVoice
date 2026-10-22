# Java Programming and Spring Boot Guide

## What is Java?
Java is a popular, high-level, object-oriented programming language designed by Sun Microsystems and now owned by Oracle. Its core philosophy is "Write Once, Run Anywhere", which means compiled Java bytecode runs on any platform that has a Java Virtual Machine (JVM). It is platform-independent, strongly typed, secure, and has automatic garbage collection for memory management. It is widely used for enterprise backend systems, banking applications, web services, and Android apps.

## What are the OOPs concepts in Java?
Java is built around four fundamental Object-Oriented Programming (OOP) principles:
1. Encapsulation: Wrapping code and data together into a single unit or class. Fields are kept private and accessed through public getter and setter methods to ensure data security.
2. Inheritance: Allowing a child class to inherit fields and methods from a parent class using the "extends" keyword, which promotes code reuse.
3. Polymorphism: The ability for an action or object to take multiple forms. This includes compile-time polymorphism through method overloading, and runtime polymorphism through method overriding.
4. Abstraction: Hiding internal implementation details and showing only the essential interface to the user, achieved using abstract classes and interfaces.

## What is the Java Collection Framework?
The Java Collection Framework is a set of classes and interfaces in the java.util package that provides a standardized architecture for storing and manipulating groups of objects. The primary interfaces are:
- List: An ordered collection that allows duplicate elements. Common implementations are ArrayList and LinkedList.
- Set: A collection that does not allow duplicate elements. Common implementations are HashSet and TreeSet.
- Queue: A collection designed for holding elements prior to processing in first-in-first-out order.
- Map: A collection of key-value pairs where keys must be unique. Common implementations are HashMap and TreeMap.
The framework provides built-in methods for sorting, searching, and iterating over data efficiently.

## What is the difference between ArrayList and LinkedList in Java?
An ArrayList uses a resizable dynamic array under the hood. It offers very fast O(1) random access by index, making it ideal for retrieving data, but inserting or deleting elements in the middle is slower because elements must be shifted.
A LinkedList uses a doubly-linked list where each node stores a reference to its previous and next neighbor. Inserting and removing elements is fast, but accessing an element by index is slower because it has to traverse from the beginning or end of the list.

## What is the difference between HashMap and HashSet in Java?
A HashSet stores unique individual elements and does not permit duplicates. Internally, a HashSet is backed by a HashMap where your elements are used as keys.
A HashMap stores key-value pairs where each key must be unique, but values can be duplicated. Both HashMap and HashSet provide constant time O(1) average performance for basic operations like adding, removing, and lookup.

## What is Spring Boot?
Spring Boot is an open-source, Java-based framework built by Pivotal (now VMware) on top of the Spring framework. It is designed to create stand-alone, production-grade microservices and web applications with minimal effort. Its four core features are:
1. Auto-Configuration: Automatically configures your application based on the jar dependencies you have on your classpath.
2. Starter Dependencies: Pre-bundled dependencies like "spring-boot-starter-web" that pull in everything needed to build REST APIs.
3. Embedded Servlet Container: Includes an embedded Tomcat or Jetty server, allowing you to run your application as a simple runnable JAR without needing an external web server.
4. Spring Boot Actuator: Provides built-in monitoring endpoints for health checks, metrics, and application environment information.

## What is the difference between Spring and Spring Boot?
The traditional Spring Framework provides dependency injection, inversion of control, and enterprise features, but it requires substantial manual setup, XML or annotation configuration, and manual server deployment.
Spring Boot is an extension of Spring that eliminates this boilerplate configuration. It provides opinionated defaults, auto-configuration, starter dependencies, and an embedded Tomcat server so you can create and launch a production-ready application in minutes.
